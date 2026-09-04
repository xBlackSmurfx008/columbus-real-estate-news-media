"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics-client";
import { currentAttribution, trackFunnelStage } from "@/lib/funnel-client";
import { funnelForPersona } from "@/scripts/funnel-lib.mjs";
import { CONSENT_COPY, FORM_VERSIONS } from "@/lib/compliance/policy-versions";

export type LeadField = {
  name: string;
  label: string;
  type?: "text" | "select" | "textarea";
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

export function LeadForm({
  persona,
  source,
  fields,
  submitLabel = "Send my request",
  successMessage = "Got it. You'll hear from us within 1 business day.",
}: {
  persona: "fsbo_seller" | "investor_seller" | "capital_partner" | "renter" | "rental_listing" | "directory_listing" | "profile_claim";
  source: string;
  fields: LeadField[];
  submitLabel?: string;
  successMessage?: string;
}) {
  const consentCopy = persona === "profile_claim" ? CONSENT_COPY.profileClaim : CONSENT_COPY.leadRouting;
  const consentPolicyPath = persona === "profile_claim" ? "/profile-claim-policy" : "/lead-disclosure";
  const consentPolicyLabel = persona === "profile_claim" ? "Profile Claim Policy" : "Lead Disclosure Policy";
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const funnel = funnelForPersona(persona);
  const startedRef = useRef(false);

  // form_start fires once, on the reader's first real interaction with a field
  // (not on render) — otherwise every funnel_view would look like a start.
  function onFirstInteraction() {
    if (startedRef.current || !funnel) return;
    startedRef.current = true;
    trackFunnelStage(funnel.slug, "form_start", { placement: source });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const data = new FormData(event.currentTarget);
    const details: Record<string, string> = {};
    for (const f of fields) {
      const v = data.get(f.name);
      if (typeof v === "string" && v.trim()) details[f.name] = v.trim().slice(0, 500);
    }

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona,
          source,
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          area: data.get("area"),
          details,
          sourceRoute: window.location.pathname + window.location.search,
          formVersion: FORM_VERSIONS.lead,
          consentVersion: consentCopy.version,
          consent: data.get("consent") === "on",
          company: data.get("company"), // honeypot
          // Funnel attribution travels with the submission so the server can
          // write form_submit already joined to article, area and campaign.
          attribution: { ...currentAttribution(), placement: source },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      trackEvent("generate_lead", { method: source, persona, conversion: true });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-8 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--green-pale)] p-5 text-sm text-[color:var(--text-secondary)]">
        <p className="font-semibold text-[color:var(--text-hero)]">{successMessage}</p>
        <p className="mt-2">
          Want Columbus market updates while you wait?{" "}
          <a href="/join?source=lead-success" className="cren-text-link">
            Join free — weekly brief and first access to deal alerts
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="form-box mt-8" id="lead-form">
      <form
        className="grid gap-4"
        onSubmit={onSubmit}
        onFocusCapture={onFirstInteraction}
        onInputCapture={onFirstInteraction}
      >
        {/* Honeypot — hidden from real visitors */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Name
            <input className="form-input" name="name" type="text" autoComplete="name" placeholder="Your name" required />
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Email
            <input className="form-input" name="email" type="email" autoComplete="email" placeholder="you@email.com" required />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Phone (optional)
            <input className="form-input" name="phone" type="tel" autoComplete="tel" placeholder="(614) 555-0123" />
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Area / neighborhood
            <input className="form-input" name="area" type="text" placeholder="e.g. Hilltop, Dublin, 43204" />
          </label>
        </div>

        {fields.map((f) => (
          <label key={f.name} className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            {f.label}
            {f.type === "select" && f.options ? (
              <select className="form-input" name={f.name} required={f.required} defaultValue="">
                <option value="" disabled>
                  Choose one
                </option>
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea className="form-input min-h-[100px]" name={f.name} placeholder={f.placeholder} required={f.required} />
            ) : (
              <input className="form-input" name={f.name} type="text" placeholder={f.placeholder} required={f.required} />
            )}
          </label>
        ))}

        <label className="flex items-start gap-2 text-sm text-[color:var(--text-secondary)]">
          <input type="checkbox" name="consent" required className="mt-1" />
          <span>
            {consentCopy.text} Read the{" "}
            <Link href={consentPolicyPath} className="cren-text-link">
              {consentPolicyLabel}
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="cren-text-link">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {error && (
          <p className="text-sm text-[color:var(--red)]" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="form-submit mt-2 w-full md:w-auto" disabled={sending}>
          {sending ? "Sending…" : submitLabel}
        </button>
      </form>
    </div>
  );
}

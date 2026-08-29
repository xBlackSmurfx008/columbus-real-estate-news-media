"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { trackEvent } from "@/lib/analytics-client";
import { CONSENT_COPY, FORM_VERSIONS } from "@/lib/compliance/policy-versions";

export function ContactForm({ source }: { source: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
          source,
          sourceRoute: window.location.pathname + window.location.search,
          formVersion: FORM_VERSIONS.contact,
          consentVersion: CONSENT_COPY.contactPermission.version,
          consent: data.get("consent") === "on",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      trackEvent("contact_request", { method: source, conversion: true });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <p className="mt-8 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--green-pale)] p-4 text-sm text-[color:var(--text-secondary)]">
        Thanks for reaching out. This inbox is monitored for editorial tips, corrections, partnerships, and general questions.
        For sponsorship, start on the{" "}
        <Link href="/advertise" className="cren-text-link">
          Advertise
        </Link>{" "}
        page.
      </p>
    );
  }

  return (
    <div className="form-box mt-8">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <input type="hidden" name="contact_source" value={source} />
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Name
          <input
            className="form-input"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            required
          />
        </label>
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Email
          <input
            className="form-input"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            required
          />
        </label>
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Message
          <textarea
            className="form-input min-h-[140px]"
            name="message"
            placeholder="Tip, correction, partnership idea, or question"
            required
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-[color:var(--text-secondary)]">
          <input type="checkbox" name="consent" required className="mt-1" />
          <span>
            {CONSENT_COPY.contactPermission.text} Read the{" "}
            <Link href="/privacy" className="cren-text-link">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/communications-policy" className="cren-text-link">
              Communications Policy
            </Link>
            .
          </span>
        </label>
        {error && (
          <p className="text-sm text-[color:var(--red)]" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="form-submit mt-2 w-full" disabled={sending}>
          {sending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}

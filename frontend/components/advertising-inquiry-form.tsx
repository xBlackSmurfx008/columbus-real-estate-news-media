"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics-client";
import { CONSENT_COPY, FORM_VERSIONS } from "@/lib/compliance/policy-versions";
import { ADVERTISING_PACKAGE_OPTIONS } from "@/lib/directory-sponsorship";

const PACKAGE_OPTIONS = ADVERTISING_PACKAGE_OPTIONS;

export function AdvertisingInquiryForm({
  source = "advertise-page",
  submitLabel = "Send advertising inquiry",
  successMessage = "Thanks. Your advertising inquiry is in the queue, and the newsroom has been notified.",
}: {
  source?: string;
  submitLabel?: string;
  successMessage?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          inquiry_type: "advertising",
          source,
          name: data.get("name"),
          email: data.get("email"),
          company: data.get("company"),
          package_interest: data.get("package"),
          budget: data.get("budget"),
          message: data.get("message"),
          sourceRoute: window.location.pathname + window.location.search,
          formVersion: FORM_VERSIONS.advertisingInquiry,
          consentVersion: CONSENT_COPY.advertiserTerms.version,
          consent: data.get("consent") === "on",
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      trackEvent("generate_lead", { method: source, inquiry_type: "advertising", conversion: true });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <p className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--green-pale)] p-5 text-sm text-[color:var(--text-secondary)]">
        {successMessage}
      </p>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Name
          <input className="form-input" name="name" autoComplete="name" required />
        </label>
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Work email
          <input className="form-input" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Company
          <input className="form-input" name="company" autoComplete="organization" />
        </label>
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Package
          <select className="form-input" name="package" defaultValue="Not sure yet">
            {PACKAGE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)] md:col-span-2">
          Approximate budget
          <input className="form-input" name="budget" placeholder="Monthly or campaign budget" />
        </label>
      </div>
      <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
        What audience and outcome do you need?
        <textarea className="form-input min-h-[120px]" name="message" required />
      </label>
      <label className="flex items-start gap-2 text-sm text-[color:var(--text-secondary)]">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>
          {CONSENT_COPY.advertiserTerms.text} Read the{" "}
          <Link href="/advertising-terms" className="cren-text-link">
            Advertising Terms
          </Link>{" "}
          and{" "}
          <Link href="/sponsored-content-policy" className="cren-text-link">
            Sponsored Content Policy
          </Link>
          .
        </span>
      </label>
      {error && <p className="text-sm text-[color:var(--red)]" role="alert">{error}</p>}
      <button type="submit" className="form-submit w-full md:w-auto" disabled={sending}>
        {sending ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}

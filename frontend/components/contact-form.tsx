"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { trackEvent } from "@/lib/analytics-client";

export function ContactForm({ source }: { source: string }) {
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    trackEvent("contact_request", { method: source, conversion: true });
    setSubmitted(true);
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
        <button type="submit" className="form-submit mt-2 w-full">
          Send message
        </button>
      </form>
    </div>
  );
}

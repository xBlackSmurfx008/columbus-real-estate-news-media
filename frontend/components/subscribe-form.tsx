"use client";

import { FormEvent, useState } from "react";
import { trackEvent } from "@/lib/analytics-client";

export function SubscribeForm({ source }: { source: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const data = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          area: data.get("area"),
          topic: data.get("topic"),
          source,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      trackEvent("sign_up", { method: source, conversion: true });
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
        You&apos;re in. Watch your inbox for the next Columbus market brief.
      </p>
    );
  }

  return (
    <div className="form-box mt-8">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <input type="hidden" name="signup_source" value={source} />
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Email
          <input className="form-input" name="email" type="email" placeholder="you@company.com" required />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Area
            <select className="form-input" name="area" defaultValue="Upper Arlington">
              <option>Upper Arlington</option>
              <option>Dublin</option>
              <option>Grove City</option>
              <option>Westerville</option>
              <option>Columbus Citywide</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Topic
            <select className="form-input" name="topic" defaultValue="Market Trends">
              <option>Market Trends</option>
              <option>Schools</option>
              <option>Development</option>
              <option>Local Politics</option>
              <option>Events & Lifestyle</option>
            </select>
          </label>
        </div>

        {error && (
          <p className="text-sm text-[color:var(--red)]" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="form-submit mt-2 w-full md:w-auto" disabled={sending}>
          {sending ? "Saving…" : "Save preferences"}
        </button>
      </form>
    </div>
  );
}

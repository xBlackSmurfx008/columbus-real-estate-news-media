"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics-client";

type AreaFollowFormProps = {
  areaName: string;
  areaSlug: string;
  followPromise: string;
  source: string;
};

export function AreaFollowForm({ areaName, areaSlug, followPromise, source }: AreaFollowFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const data = new FormData(event.currentTarget);
    const cadence = String(data.get("cadence") ?? "weekly");

    trackEvent("area_follow_start", {
      area_slug: areaSlug,
      area_name: areaName,
      method: source,
      cadence,
    });

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          area: areaName,
          topic: "Area Alerts",
          source,
          role: "area-follower",
          cadence,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      trackEvent("preference_saved", {
        area_slug: areaSlug,
        area_name: areaName,
        topic: "Area Alerts",
        method: source,
        cadence,
        conversion: true,
      });
      trackEvent("activation_step", {
        step: "area_follow",
        area_slug: areaSlug,
        method: source,
      });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="cren-soft p-5 md:p-6" data-section-id={`area-follow-${areaSlug}`}>
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(280px,360px)] lg:items-end">
        <div>
          <div className="section-eyebrow">Follow promise</div>
          <h2 className="cren-heading-md">Follow {areaName}</h2>
          <p className="cren-body mt-2 text-sm">{followPromise}</p>
          <p className="mt-3 text-xs text-[color:var(--text-muted)]">
            CREN uses this preference for email updates and measurement. It does not create a public profile.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4 text-sm">
            <p className="font-semibold text-[color:var(--text-hero)]">Your area preference is saved.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/areas" className="cren-action-chip">Compare nearby areas</Link>
              <Link href="/rent/before-you-sign" className="cren-action-chip">Open renter checklist</Link>
            </div>
          </div>
        ) : (
          <form className="grid gap-3" onSubmit={onSubmit}>
            <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
              Email
              <input className="form-input" name="email" type="email" autoComplete="email" placeholder="you@email.com" required />
            </label>
            <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
              Alert cadence
              <select className="form-input" name="cadence" defaultValue="weekly">
                <option value="weekly">Weekly</option>
                <option value="important-changes">Only important changes</option>
                <option value="rental-season">Rental season or market shifts</option>
              </select>
            </label>
            {error && <p className="text-sm text-[color:var(--data-down)]" role="alert">{error}</p>}
            <button type="submit" className="form-submit mt-0" disabled={sending}>
              {sending ? "Saving..." : "Follow this area"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

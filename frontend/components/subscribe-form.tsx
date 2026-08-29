"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics-client";

type SubscribeFormProps = {
  source: string;
  initialEmail?: string;
  initialArea?: string;
  initialTopic?: string;
};

const areaOptions = [
  "Columbus Citywide",
  "Dublin",
  "German Village",
  "Franklinton",
  "The Ohio State University area",
  "Upper Arlington",
  "Grandview Heights",
  "Bexley",
  "Westerville",
  "Clintonville",
];

const interestOptions = [
  "Area Alerts",
  "Market Pulse",
  "Development Watch",
  "Weekend Planner",
  "Before You Sign",
  "Buyer Price-Band Reality",
];

export function SubscribeForm({ source, initialEmail = "", initialArea = "", initialTopic = "Area Alerts" }: SubscribeFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const data = new FormData(event.currentTarget);
    const interests = data.getAll("interests").map(String);
    const area = String(data.get("area") ?? "");
    const topic = String(data.get("topic") ?? "");
    const cadence = String(data.get("cadence") ?? "");
    const role = String(data.get("role") ?? "");
    const interestSummary = interests.join(", ");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          area,
          topic,
          source,
          role,
          timeline: data.get("timeline"),
          budget: data.get("budget"),
          commuteAnchor: data.get("commuteAnchor"),
          cadence,
          interests,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      trackEvent("sign_up", { method: source, conversion: true, area, topic });
      trackEvent("preference_saved", { method: source, conversion: true, area, topic, cadence, role, interests: interestSummary });
      trackEvent("activation_step", { step: "preference_capture", method: source, area, topic, cadence, role });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-8 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--green-pale)] p-4 text-sm text-[color:var(--text-secondary)]">
        <p className="font-semibold text-[color:var(--text-hero)]">Your CREN preferences are saved.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/areas" className="cren-action-chip">Compare areas</Link>
          <Link href="/rent/before-you-sign" className="cren-action-chip">Open renter checklist</Link>
          <Link href="/housing-search" className="cren-action-chip">Use housing search</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="form-box mt-8">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <input type="hidden" name="signup_source" value={source} />
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Email
          <input className="form-input" name="email" type="email" autoComplete="email" placeholder="you@email.com" defaultValue={initialEmail} required />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Area
            <input className="form-input" name="area" list="subscribe-area-options" placeholder="Dublin, Franklinton, OSU Area" defaultValue={initialArea} />
            <datalist id="subscribe-area-options">
              {areaOptions.map((area) => <option key={area} value={area} />)}
            </datalist>
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Main update
            <input className="form-input" name="topic" list="subscribe-topic-options" placeholder="Area Alerts" defaultValue={initialTopic} />
            <datalist id="subscribe-topic-options">
              {interestOptions.map((topic) => <option key={topic} value={topic} />)}
            </datalist>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            I am mainly
            <select className="form-input" name="role" defaultValue="renter">
              <option value="renter">Renting or moving soon</option>
              <option value="buyer">Buying</option>
              <option value="seller">Selling</option>
              <option value="investor">Owning or investing</option>
              <option value="resident">Following my area</option>
              <option value="business">Running a local business</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Timeline
            <select className="form-input" name="timeline" defaultValue="researching">
              <option value="researching">Researching</option>
              <option value="0-90-days">0-90 days</option>
              <option value="3-6-months">3-6 months</option>
              <option value="6-plus-months">6+ months</option>
              <option value="ongoing">Ongoing local updates</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Budget or rent range
            <input className="form-input" name="budget" placeholder="$1,400 rent, $350K buy, or flexible" />
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Commute anchor
            <input className="form-input" name="commuteAnchor" placeholder="Downtown, OSU, Dublin, airport, remote" />
          </label>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold text-[color:var(--text-hero)]">Interests</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {interestOptions.map((interest) => (
              <label key={interest} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--text-secondary)]">
                <input type="checkbox" name="interests" value={interest} defaultChecked={interest === initialTopic} />
                <span>{interest}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Cadence
          <select className="form-input" name="cadence" defaultValue="weekly">
            <option value="weekly">Weekly</option>
            <option value="important-changes">Only important changes</option>
            <option value="weekend">Weekend planning</option>
            <option value="rental-season">Rental season or market shifts</option>
          </select>
        </label>

        {error && (
          <p className="text-sm text-[color:var(--red)]" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="form-submit mt-2 w-full md:w-auto" disabled={sending}>
          {sending ? "Saving..." : "Save preferences"}
        </button>
      </form>
    </div>
  );
}

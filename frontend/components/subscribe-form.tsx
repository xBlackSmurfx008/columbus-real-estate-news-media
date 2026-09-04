"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics-client";
import { CONSENT_COPY, FORM_VERSIONS } from "@/lib/compliance/policy-versions";

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

type Step = "signup" | "profile" | "done";

export function SubscribeForm({ source, initialEmail = "", initialArea = "", initialTopic = "Area Alerts" }: SubscribeFormProps) {
  // Progressive profiling. Step 1 makes you a member with an email address.
  // Step 2 is optional and never blocks membership.
  const [step, setStep] = useState<Step>("signup");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [area, setArea] = useState(initialArea);
  const [topic, setTopic] = useState(initialTopic);

  // One view event per step, per mount. The refs keep React's development
  // double-invoke from inflating the signup and profile denominators.
  const signupViewSent = useRef(false);
  const profileViewSent = useRef(false);

  useEffect(() => {
    if (signupViewSent.current) return;
    signupViewSent.current = true;
    trackEvent("membership_signup_view", { method: source, step: "signup" });
  }, [source]);

  useEffect(() => {
    if (step !== "profile" || profileViewSent.current) return;
    profileViewSent.current = true;
    trackEvent("membership_profile_view", { method: source, step: "profile", area, topic });
    // area and topic are fixed by the time step 2 renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function onSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const data = new FormData(event.currentTarget);
    const nextEmail = String(data.get("email") ?? "");
    const nextArea = String(data.get("area") ?? "");
    const nextTopic = String(data.get("topic") ?? "");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "signup",
          email: nextEmail,
          area: nextArea,
          topic: nextTopic,
          source,
          sourceRoute: window.location.pathname + window.location.search,
          formVersion: FORM_VERSIONS.subscribe,
          consentVersion: CONSENT_COPY.emailMarketing.version,
          consent: data.get("consent") === "on",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      setEmail(nextEmail);
      setArea(nextArea);
      setTopic(nextTopic);
      trackEvent("membership_signup", { method: source, step: "signup", conversion: true, area: nextArea, topic: nextTopic });
      trackEvent("sign_up", { method: source, conversion: true, area: nextArea, topic: nextTopic });
      setStep("profile");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function onProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const data = new FormData(event.currentTarget);
    const interests = data.getAll("interests").map(String);
    const cadence = String(data.get("cadence") ?? "");
    const role = String(data.get("role") ?? "");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "profile",
          email,
          area,
          topic,
          source,
          role,
          timeline: data.get("timeline"),
          budget: data.get("budget"),
          commuteAnchor: data.get("commuteAnchor"),
          cadence,
          interests,
          sourceRoute: window.location.pathname + window.location.search,
          formVersion: FORM_VERSIONS.subscribe,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      trackEvent("membership_profile_complete", {
        method: source,
        step: "profile",
        conversion: true,
        area,
        topic,
        cadence,
        role,
        interests: interests.join(", "),
      });
      trackEvent("preference_saved", { method: source, conversion: true, area, topic, cadence, role, interests: interests.join(", ") });
      trackEvent("activation_step", { step: "preference_capture", method: source, area, topic, cadence, role });
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function onSkip() {
    trackEvent("membership_profile_skip", { method: source, step: "profile", area, topic });
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="mt-8 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--green-pale)] p-4 text-sm text-[color:var(--text-secondary)]">
        <p className="font-semibold text-[color:var(--text-hero)]">You are a CREN member.</p>
        <p className="mt-1">We have your email and your area. Start here:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/areas" className="cren-action-chip">Compare areas</Link>
          <Link href="/rent/before-you-sign" className="cren-action-chip">Open renter checklist</Link>
          <Link href="/housing-search" className="cren-action-chip">Use housing search</Link>
        </div>
      </div>
    );
  }

  if (step === "profile") {
    return (
      <div className="form-box mt-8">
        <div className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--green-pale)] p-4">
          <p className="font-semibold text-[color:var(--text-hero)]">You are in. Membership is done.</p>
          <p className="cren-body mt-1 text-sm">
            Nothing below is required. Answer what you want and we will aim the coverage at your situation instead of
            the average reader. You can close this page and keep your membership.
          </p>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={onProfile}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
              You are mainly
              <select className="form-input" name="role" defaultValue="renter">
                <option value="renter">Renting or moving soon</option>
                <option value="buyer">Buying</option>
                <option value="seller">Selling</option>
                <option value="investor">Owning or investing</option>
                <option value="resident">Following your area</option>
                <option value="business">Running a local business</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
              Your timeline
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
              Your budget or rent range
              <input className="form-input" name="budget" placeholder="$1,400 rent, $350K buy, or flexible" />
            </label>
            <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
              Your commute anchor
              <input className="form-input" name="commuteAnchor" placeholder="Downtown, OSU, Dublin, airport, remote" />
            </label>
          </div>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold text-[color:var(--text-hero)]">Topics you want</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {interestOptions.map((interest) => (
                <label key={interest} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--text-secondary)]">
                  <input type="checkbox" name="interests" value={interest} defaultChecked={interest === topic} />
                  <span>{interest}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            How often you would want to hear from us
            <select className="form-input" name="cadence" defaultValue="weekly">
              <option value="weekly">Weekly</option>
              <option value="important-changes">Only important changes</option>
              <option value="weekend">Weekend planning</option>
              <option value="rental-season">Rental season or market shifts</option>
            </select>
            <span className="text-xs text-[color:var(--text-muted)]">
              This is your preference, not a schedule we have promised. We tell you before the first email goes out.
            </span>
          </label>

          {error && (
            <p className="text-sm text-[color:var(--red)]" role="alert">
              {error}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="submit" className="form-submit w-full md:w-auto" disabled={sending}>
              {sending ? "Saving..." : "Save my preferences"}
            </button>
            <button type="button" onClick={onSkip} className="cren-text-link text-sm" disabled={sending}>
              Skip for now
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="form-box mt-8">
      <form className="grid gap-4" onSubmit={onSignup}>
        <input type="hidden" name="signup_source" value={source} />
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Your email
          <input className="form-input" name="email" type="email" autoComplete="email" placeholder="you@email.com" defaultValue={initialEmail} required />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Your part of Columbus
            <input className="form-input" name="area" list="subscribe-area-options" placeholder="Dublin, Franklinton, OSU Area" defaultValue={initialArea} />
            <datalist id="subscribe-area-options">
              {areaOptions.map((option) => <option key={option} value={option} />)}
            </datalist>
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            What you want to follow
            <input className="form-input" name="topic" list="subscribe-topic-options" placeholder="Area Alerts" defaultValue={initialTopic} />
            <datalist id="subscribe-topic-options">
              {interestOptions.map((option) => <option key={option} value={option} />)}
            </datalist>
          </label>
        </div>

        <label className="flex items-start gap-2 text-sm text-[color:var(--text-secondary)]">
          <input type="checkbox" name="consent" required className="mt-1" />
          <span>
            {CONSENT_COPY.emailMarketing.text} Read the{" "}
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
        <button type="submit" className="form-submit mt-2 w-full md:w-auto" disabled={sending}>
          {sending ? "Joining..." : "Join free"}
        </button>
        <p className="text-xs text-[color:var(--text-muted)]">
          That is the whole form. The rest is optional and comes after.
        </p>
      </form>
    </div>
  );
}

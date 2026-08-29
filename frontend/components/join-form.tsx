"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics-client";

const INTEREST_OPTIONS = [
  "Buying a home",
  "Selling a home",
  "Renting",
  "Investing",
  "Market data & trends",
];

export function JoinForm({ source }: { source: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  function toggle(interest: string) {
    setPicked((p) => (p.includes(interest) ? p.filter((x) => x !== interest) : [...p, interest]));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const data = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          name: data.get("name"),
          password: data.get("password"),
          interests: picked.join(", "),
          source,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      trackEvent("sign_up", { method: source, membership: true, conversion: true });
      router.push("/profile?welcome=1");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="form-box mt-8">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Name
            <input className="form-input" name="name" type="text" autoComplete="name" placeholder="Your name" required />
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Email
            <input className="form-input" name="email" type="email" autoComplete="email" placeholder="you@email.com" required />
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)] md:col-span-2">
            Password
            <input className="form-input" name="password" type="password" autoComplete="new-password" minLength={10} placeholder="At least 10 characters" required />
          </label>
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm text-[color:var(--text-secondary)]">What are you interested in? (pick any)</legend>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => toggle(o)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  picked.includes(o)
                    ? "border-[color:var(--green)] bg-[color:var(--green)] text-white"
                    : "border-[color:var(--border)] bg-transparent text-[color:var(--text-secondary)]"
                }`}
                aria-pressed={picked.includes(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="text-sm text-[color:var(--red)]" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="form-submit mt-2 w-full md:w-auto" disabled={sending}>
          {sending ? "Joining…" : "Join free"}
        </button>
      </form>
    </div>
  );
}

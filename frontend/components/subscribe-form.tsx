"use client";

import { FormEvent } from "react";
import { trackEvent } from "@/lib/analytics-client";

export function SubscribeForm({ source }: { source: string }) {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trackEvent("sign_up", { method: source, conversion: true });
  };

  return (
    <div className="form-box mt-8">
      <form className="grid gap-4" onSubmit={onSubmit}>
        <input type="hidden" name="signup_source" value={source} />
        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          Email
          <input className="form-input" type="email" placeholder="you@company.com" required />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Area
            <select className="form-input" defaultValue="Upper Arlington">
              <option>Upper Arlington</option>
              <option>Dublin</option>
              <option>Grove City</option>
              <option>Westerville</option>
              <option>Columbus Citywide</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Topic
            <select className="form-input" defaultValue="Market Trends">
              <option>Market Trends</option>
              <option>Schools</option>
              <option>Development</option>
              <option>Local Politics</option>
              <option>Events & Lifestyle</option>
            </select>
          </label>
        </div>

        <button type="submit" className="form-submit mt-2 w-full md:w-auto">
          Save preferences
        </button>
      </form>
    </div>
  );
}

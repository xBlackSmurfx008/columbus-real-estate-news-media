"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id: number;
  email: string;
  name: string | null;
  interests: string | null;
  preferred_area: string | null;
  role: string | null;
  bio: string | null;
  created_at: string;
};

const INTERESTS = ["Buying a home", "Selling a home", "Renting", "Investing", "Market data & trends"];
const AREAS = ["Columbus Citywide", "Dublin", "German Village", "Franklinton", "The Ohio State University area", "Upper Arlington", "Grandview Heights", "Bexley", "Westerville", "Clintonville"];

function splitInterests(value: string | null) {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

export function ProfilePanel({ welcome = false }: { welcome?: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: "", interests: [] as string[], preferredArea: "", role: "", bio: "" });
  const [email, setEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(welcome ? "Your account is ready. Complete your profile below." : null);

  useEffect(() => {
    fetch("/api/member-auth")
      .then(async (response) => {
        const data = await response.json();
        if (data.authenticated) applyProfile(data.profile);
      })
      .catch(() => setError("We could not load your profile."))
      .finally(() => setLoading(false));
  }, []);

  function applyProfile(nextProfile: Profile) {
    setProfile(nextProfile);
    setForm({
      name: nextProfile.name ?? "",
      interests: splitInterests(nextProfile.interests),
      preferredArea: nextProfile.preferred_area ?? "",
      role: nextProfile.role ?? "",
      bio: nextProfile.bio ?? "",
    });
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/member-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Invalid email or password.");
        return;
      }
      setLoginPassword("");
      applyProfile(data.profile);
      setNotice("You are signed in.");
    } catch {
      setError("We could not sign you in. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSending(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, interests: form.interests }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "We could not save your profile.");
        return;
      }
      applyProfile(data.profile);
      setNotice("Your profile is saved.");
    } catch {
      setError("We could not save your profile. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function logout() {
    await fetch("/api/member-auth", { method: "DELETE" });
    setProfile(null);
    setNotice(null);
    router.replace("/profile");
  }

  function toggleInterest(value: string) {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(value)
        ? current.interests.filter((item) => item !== value)
        : [...current.interests, value],
    }));
  }

  if (loading) return <div className="cren-surface p-8 text-sm text-[color:var(--text-secondary)]">Loading your profile...</div>;

  if (!profile) {
    return (
      <div className="cren-surface p-8">
        <div className="section-eyebrow">Member access</div>
        <h1 className="cren-heading-xl">Your Columbus profile</h1>
        <p className="cren-body mt-2 max-w-xl">Sign in to keep your areas and interests in one place.</p>
        <form className="mt-8 grid max-w-xl gap-4" onSubmit={login}>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Email
            <input className="form-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Password
            <input className="form-input" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required />
          </label>
          {error && <p className="text-sm text-[color:var(--data-down)]" role="alert">{error}</p>}
          <button type="submit" className="form-submit w-full sm:w-auto" disabled={sending}>{sending ? "Signing in..." : "Sign in"}</button>
        </form>
        <p className="cren-body mt-6 text-sm">New here? <Link href="/join" className="cren-text-link">Create a free account</Link></p>
      </div>
    );
  }

  return (
    <div className="cren-surface p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-eyebrow">Member profile</div>
          <h1 className="cren-heading-xl">Welcome, {form.name || "member"}</h1>
          <p className="cren-body mt-2">Your profile keeps your CREN preferences connected to your account.</p>
        </div>
        <button type="button" className="cren-action-chip" onClick={logout}>Sign out</button>
      </div>

      <form className="mt-8 grid gap-5" onSubmit={saveProfile}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Name
            <input className="form-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Email
            <input className="form-input" value={profile.email} readOnly aria-readonly="true" />
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            I am here as a
            <select className="form-input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="">Choose one</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="renter">Renter</option>
              <option value="investor">Investor</option>
              <option value="local-business">Local business</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
            Area of interest
            <select className="form-input" value={form.preferredArea} onChange={(event) => setForm({ ...form, preferredArea: event.target.value })}>
              <option value="">Choose an area</option>
              {AREAS.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          </label>
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm text-[color:var(--text-secondary)]">Topics I follow</legend>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button key={interest} type="button" className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${form.interests.includes(interest) ? "border-[color:var(--green)] bg-[color:var(--green)] text-white" : "border-[color:var(--border)] bg-transparent text-[color:var(--text-secondary)]"}`} aria-pressed={form.interests.includes(interest)} onClick={() => toggleInterest(interest)}>{interest}</button>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-1 text-sm text-[color:var(--text-secondary)]">
          About me
          <textarea className="form-input min-h-28" value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} maxLength={500} placeholder="Optional context for your Columbus interests" />
        </label>

        {error && <p className="text-sm text-[color:var(--data-down)]" role="alert">{error}</p>}
        {notice && <p className="text-sm text-[color:var(--green)]" role="status">{notice}</p>}
        <button type="submit" className="form-submit w-full sm:w-auto" disabled={sending}>{sending ? "Saving..." : "Save profile"}</button>
      </form>
    </div>
  );
}

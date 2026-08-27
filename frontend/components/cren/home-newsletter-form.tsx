"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

export function HomeNewsletterForm() {
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email");
    const q = new URLSearchParams({ source: "home-cta" });
    if (email) q.set("email", String(email));
    router.push(`/subscribe?${q.toString()}`);
  }

  return (
    <form className="nl-form" onSubmit={onSubmit}>
      <input className="nl-input" name="email" type="email" placeholder="Enter your email..." required />
      <button className="nl-btn" type="submit">
        Subscribe Free
      </button>
    </form>
  );
}

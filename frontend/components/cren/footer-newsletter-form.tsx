"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

export function FooterNewsletterForm() {
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email");
    const q = new URLSearchParams({ source: "footer" });
    if (email) q.set("email", String(email));
    router.push(`/subscribe?${q.toString()}`);
  }

  return (
    <form className="footer-nl-form" onSubmit={onSubmit}>
      <input className="footer-nl-input" name="email" type="email" placeholder="Email" required />
      <button className="footer-nl-btn" type="submit">
        Join
      </button>
    </form>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { getSearchRecoveryIntent } from "@/lib/consumer-insights";
import { trackEvent } from "@/lib/analytics-client";

export function ZeroResultRecovery({ query }: { query: string }) {
  const intent = getSearchRecoveryIntent(query);
  const encodedQuery = encodeURIComponent(query);

  useEffect(() => {
    trackEvent("search_no_results", {
      search_term: query,
      inferred_intent: intent,
    });
  }, [intent, query]);

  const primary =
    intent === "rent"
      ? { href: "/rent/before-you-sign", label: "Open renter checklist", text: "Use the due-diligence flow before you trust a listing, review, or lease." }
      : intent === "buy"
        ? { href: "/buy/price-band-reality", label: "Open buyer price bands", text: "Start with price-band reality, area substitution, and buyer readiness." }
        : intent === "invest"
          ? { href: "/invest", label: "Open investor view", text: "Review property-management, code, rent, and development risk before underwriting." }
          : intent === "local-life"
            ? { href: "/things-to-do", label: "Open local living", text: "Browse parks, kids, restaurants, events, and weekend ideas by area." }
            : { href: "/areas", label: "Compare areas", text: "Start with the area index, then narrow by budget, commute, and local routine." };

  return (
    <section className="cren-surface p-6 md:p-8" data-section-id="search-zero-result-recovery">
      <div className="max-w-3xl">
        <h3 className="cren-heading-md">No exact match yet</h3>
        <p className="cren-body mt-2">
          CREN can still turn this into a useful next step. Save the question, ask the newsroom, or browse related decision tools.
        </p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link href={primary.href} className="cren-soft cren-card-link p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">Best next step</span>
          <strong className="mt-2 block text-[color:var(--text-hero)]">{primary.label}</strong>
          <span className="mt-1 block text-sm text-[color:var(--text-secondary)]">{primary.text}</span>
        </Link>
        <Link href={`/subscribe?source=zero-result-search&topic=${encodedQuery}`} className="cren-soft cren-card-link p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">Create alert</span>
          <strong className="mt-2 block text-[color:var(--text-hero)]">Follow this question</strong>
          <span className="mt-1 block text-sm text-[color:var(--text-secondary)]">Get an update when CREN covers this area, topic, or phrase.</span>
        </Link>
        <Link href={`/contact?subject=${encodedQuery}`} className="cren-soft cren-card-link p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">Ask CREN</span>
          <strong className="mt-2 block text-[color:var(--text-hero)]">Send the question</strong>
          <span className="mt-1 block text-sm text-[color:var(--text-secondary)]">Use the consumer question to shape reporting and future search results.</span>
        </Link>
        <Link href="/areas" className="cren-soft cren-card-link p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">Nearby paths</span>
          <strong className="mt-2 block text-[color:var(--text-hero)]">Browse area hubs</strong>
          <span className="mt-1 block text-sm text-[color:var(--text-secondary)]">Compare neighborhoods, suburbs, corridors, and local-life context.</span>
        </Link>
      </div>
    </section>
  );
}

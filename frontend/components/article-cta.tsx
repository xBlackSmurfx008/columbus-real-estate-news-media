"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AreaFollowForm } from "@/components/area-follow-form";
import { trackEvent } from "@/lib/analytics-client";
import type { ArticleCta } from "@/lib/article-cta";

export const ARTICLE_CTA_PLACEMENT = "article_body_end";

type ArticleCtaSectionProps = {
  cta: ArticleCta;
  articleId: string;
  articleUrl: string;
  /** Display name for the area-follow variant. */
  areaName?: string;
  /** Follow promise copy for the area-follow variant. */
  followPromise?: string;
};

export function ArticleCtaSection({
  cta,
  articleId,
  articleUrl,
  areaName,
  followPromise,
}: ArticleCtaSectionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seen = useRef(false);

  const base = {
    funnel: cta.funnel,
    placement: ARTICLE_CTA_PLACEMENT,
    cta_id: cta.ctaId,
    article_id: articleId,
    article_url: articleUrl,
    section_id: cta.ctaId,
  };

  // Impression is the CTR denominator. Fire once, only when the block is
  // actually on screen, so the rate reflects readers who reached the end.
  useEffect(() => {
    const node = containerRef.current;
    if (!node || seen.current) return;

    const fire = () => {
      if (seen.current) return;
      seen.current = true;
      trackEvent("article_cta_view", {
        ...base,
        destination: cta.kind === "link" ? cta.href : "area-follow-form",
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      fire();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fire();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, cta.ctaId]);

  if (cta.kind === "area_follow") {
    return (
      <div ref={containerRef} data-section-id={cta.ctaId} data-cta-funnel={cta.funnel}>
        <AreaFollowForm
          areaName={areaName ?? "this area"}
          areaSlug={cta.areaSlug}
          followPromise={followPromise ?? `Get ${areaName ?? "local"} housing, development, and local-life alerts.`}
          source={`${cta.areaSlug}-article-cta`}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <section className="cren-surface p-6" data-section-id={cta.ctaId} data-cta-funnel={cta.funnel}>
        <div className="section-eyebrow">{cta.eyebrow}</div>
        <h2 className="cren-heading-lg text-[length:1.25rem]">{cta.heading}</h2>
        <p className="cren-body mt-2 max-w-2xl">{cta.body}</p>
        <Link
          href={cta.href}
          className="cren-btn cren-btn-primary mt-4 inline-flex"
          onClick={() =>
            trackEvent("article_cta_click", { ...base, destination: cta.href })
          }
        >
          {cta.actionLabel}
        </Link>
        {cta.note && (
          <p className="mt-3 text-xs text-[color:var(--text-muted)]">{cta.note}</p>
        )}
      </section>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { funnelForPath } from "@/scripts/funnel-lib.mjs";
import { captureAttribution, funnelForHref, trackFunnelStage } from "@/lib/funnel-client";

// Mounted once in the root layout, next to PageviewTracker.
//
// Records two stages for every funnel:
//   funnel_view — the reader lands on one of the four funnel pages
//   cta_click   — the reader clicks ANY same-origin link pointing at a funnel
//
// The click listener is deliberately generic: it keys off the destination, not
// off the CTA component. New CTAs added anywhere on the site (article blocks,
// area hubs, the header) are measured the moment they ship, with no extra
// instrumentation, as long as they link to a funnel path. Placement comes from
// `data-funnel-placement` when present, otherwise the nearest `data-section-id`.

export function FunnelTracker() {
  const pathname = usePathname();
  const lastViewPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const attribution = captureAttribution(pathname);

    const funnel = funnelForPath(pathname);
    if (funnel && lastViewPath.current !== pathname) {
      lastViewPath.current = pathname;
      trackFunnelStage(funnel.slug, "funnel_view", { area: attribution.area, path: pathname });
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;

      const funnel = funnelForHref(link.getAttribute("href") ?? "");
      if (!funnel) return;

      const placementEl = link.closest("[data-funnel-placement]") as HTMLElement | null;
      const sectionEl = link.closest("[data-section-id]") as HTMLElement | null;
      const areaEl = link.closest("[data-area-slug]") as HTMLElement | null;

      trackFunnelStage(funnel.slug, "cta_click", {
        placement:
          placementEl?.getAttribute("data-funnel-placement") ??
          sectionEl?.getAttribute("data-section-id") ??
          "inline-link",
        area: areaEl?.getAttribute("data-area-slug") ?? null,
      });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}

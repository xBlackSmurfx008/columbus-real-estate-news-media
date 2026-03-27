"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics-client";

const VISIT_KEY = "crem_last_visit_at";

export function AnalyticsTracker() {
  useEffect(() => {
    const now = Date.now();
    const lastVisit = window.localStorage.getItem(VISIT_KEY);
    const isReturnVisit = Boolean(lastVisit);

    trackEvent("view_item_list", {
      item_list_name: "homepage",
      isReturnVisit,
      daysSinceLastVisit: lastVisit ? Math.round((now - Number(lastVisit)) / 86400000) : null,
    });
    window.localStorage.setItem(VISIT_KEY, String(now));

    const trackedSections = new Set<string>();
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section-id]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute("data-section-id");
            if (sectionId && !trackedSections.has(sectionId)) {
              trackedSections.add(sectionId);
              trackEvent("view_item_list", { item_list_name: sectionId });
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    sections.forEach((section) => observer.observe(section));

    const trackedDepth = new Set<number>();
    const depthHandler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const percent = Math.round((scrollTop / docHeight) * 100);
      [25, 50, 75, 100].forEach((threshold) => {
        if (percent >= threshold && !trackedDepth.has(threshold)) {
          trackedDepth.add(threshold);
          trackEvent("scroll", { percent_scrolled: threshold });
        }
      });
    };

    window.addEventListener("scroll", depthHandler, { passive: true });

    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const subscribeLink = target.closest('a[href^="/subscribe"]') as HTMLAnchorElement | null;
      const contentLink = target.closest('a[href^="/blog/"], a[href^="/areas/"], a[href^="/topics/"]') as HTMLAnchorElement | null;

      if (subscribeLink) {
        const section = subscribeLink.closest("[data-section-id]");
        const source = new URL(subscribeLink.href).searchParams.get("source");
        trackEvent("sign_up", {
          method: source ?? "unknown",
          section_id: section?.getAttribute("data-section-id") ?? "unknown",
        });
      }

      if (contentLink) {
        const card = contentLink.closest("[data-item-id]");
        trackEvent("select_item", {
          item_id: card?.getAttribute("data-item-id") ?? contentLink.getAttribute("href") ?? "unknown",
          item_category: card?.getAttribute("data-item-type") ?? "content",
        });
      }
    };

    document.addEventListener("click", clickHandler);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", depthHandler);
      document.removeEventListener("click", clickHandler);
    };
  }, []);

  return null;
}

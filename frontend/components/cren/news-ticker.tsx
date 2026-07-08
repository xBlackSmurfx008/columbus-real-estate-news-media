"use client";

import { useEffect, useState } from "react";

const FALLBACK_ITEMS = [
  "Columbus metro adds 30,000+ residents a year — one of the fastest-growing metros in the Midwest",
  "Daily Columbus real estate news, published every day at noon",
  "Neighborhood-level market data for 48+ Columbus areas",
];

// Scrolling headline ticker. Renders fallback items immediately, then swaps
// in live ticker_items from the DB after mount. Content is duplicated so the
// translate(-50%) keyframe loops seamlessly. Pauses on hover.
export function NewsTicker() {
  const [items, setItems] = useState<string[]>(FALLBACK_ITEMS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const texts = (data?.tickers ?? [])
          .map((t: { text?: string }) => t.text)
          .filter((t: unknown): t is string => typeof t === "string" && t.length > 0);
        if (!cancelled && texts.length > 0) setItems(texts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const loop = [...items, ...items];

  return (
    <div className="news-ticker" aria-label="Latest Columbus real estate headlines">
      <div className="news-ticker-inner">
        {loop.map((text, i) => (
          <span key={i} className="ticker-item" aria-hidden={i >= items.length}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

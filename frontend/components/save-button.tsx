"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics-client";

type SaveButtonProps = {
  itemId: string;
  itemType: "article" | "area" | "topic" | "search";
  label?: string;
};

const STORAGE_KEY = "crem_saved_items";

export function SaveButton({ itemId, itemType, label = "Save" }: SaveButtonProps) {
  const key = useMemo(() => `${itemType}:${itemId}`, [itemType, itemId]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      setSaved(parsed.includes(key));
    } catch {
      setSaved(false);
    }
  }, [key]);

  function toggleSaved() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      const next = saved ? parsed.filter((entry) => entry !== key) : [...new Set([...parsed, key])];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(!saved);
      trackEvent("add_to_wishlist", { item_id: itemId, item_category: itemType, saved: !saved });
    } catch {
      // Non-blocking interaction
    }
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`${saved ? "Unsave" : "Save"} this ${itemType}`}
      className={`focus-ring min-h-[44px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        saved ? "border-primary/40 bg-accent text-primary" : "border-border bg-card text-foreground hover:border-primary/30"
      }`}
      onClick={toggleSaved}
    >
      {saved ? `Saved ${label}` : label}
    </button>
  );
}

"use client";

import { useMemo, useSyncExternalStore } from "react";
import { trackEvent } from "@/lib/analytics-client";

type SaveButtonProps = {
  itemId: string;
  itemType: "article" | "area" | "topic" | "search";
  label?: string;
};

const STORAGE_KEY = "crem_saved_items";
const SAVED_ITEMS_EVENT = "crem-saved-items-change";

function readSavedItems(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function subscribeToSavedItems(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SAVED_ITEMS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SAVED_ITEMS_EVENT, callback);
  };
}

export function SaveButton({ itemId, itemType, label = "Save" }: SaveButtonProps) {
  const key = useMemo(() => `${itemType}:${itemId}`, [itemType, itemId]);
  const saved = useSyncExternalStore(
    subscribeToSavedItems,
    () => readSavedItems().includes(key),
    () => false
  );

  function toggleSaved() {
    try {
      const parsed = readSavedItems();
      const next = saved ? parsed.filter((entry) => entry !== key) : [...new Set([...parsed, key])];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SAVED_ITEMS_EVENT));
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

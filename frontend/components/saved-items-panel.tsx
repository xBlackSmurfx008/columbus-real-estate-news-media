"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { SAVED_ITEMS_EVENT, SAVED_ITEMS_STORAGE_KEY } from "@/components/save-button";

export type SavedItemReference = {
  key: string;
  label: string;
  href: string;
  type: string;
  description?: string;
};

let cachedRaw = "";
let cachedKeys: string[] = [];

function readSavedKeys(): string[] {
  try {
    const raw = window.localStorage.getItem(SAVED_ITEMS_STORAGE_KEY) ?? "[]";
    if (raw === cachedRaw) return cachedKeys;
    const parsed = JSON.parse(raw);
    cachedRaw = raw;
    cachedKeys = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    return cachedKeys;
  } catch {
    return [];
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SAVED_ITEMS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SAVED_ITEMS_EVENT, callback);
  };
}

function fallbackItem(key: string): SavedItemReference {
  const [type = "saved", id = key] = key.split(":");
  return {
    key,
    label: id.replace(/[-_]+/g, " "),
    href: type === "search" ? "/search" : "/saved",
    type,
    description: "This saved item no longer matches a current CREN page.",
  };
}

export function SavedItemsPanel({ items }: { items: SavedItemReference[] }) {
  const savedKeys = useSyncExternalStore(subscribe, readSavedKeys, () => []);
  const itemByKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items]);
  const savedItems = savedKeys.map((key) => itemByKey.get(key) ?? fallbackItem(key));

  function remove(key: string) {
    try {
      const next = readSavedKeys().filter((item) => item !== key);
      window.localStorage.setItem(SAVED_ITEMS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SAVED_ITEMS_EVENT));
    } catch {
      // Saved items are local-only; failure should not block navigation.
    }
  }

  function clearAll() {
    try {
      window.localStorage.setItem(SAVED_ITEMS_STORAGE_KEY, "[]");
      window.dispatchEvent(new Event(SAVED_ITEMS_EVENT));
    } catch {
      // Saved items are local-only; failure should not block navigation.
    }
  }

  if (savedItems.length === 0) {
    return (
      <section className="cren-surface p-6 md:p-8">
        <h2 className="cren-heading-lg">No saved items yet</h2>
        <p className="cren-body mt-2 max-w-2xl text-sm">
          Save area hubs, topic hubs, stories, and search previews in this browser, then return here to pick up your research.
        </p>
        <div className="cren-btn-row mt-5">
          <Link href="/areas" className="cren-btn cren-btn-primary">Explore areas</Link>
          <Link href="/search" className="cren-btn cren-btn-outline">Search CREN</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="cren-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="cren-body text-sm">{savedItems.length} saved item{savedItems.length === 1 ? "" : "s"} in this browser.</p>
        <button type="button" className="cren-btn cren-btn-outline" onClick={clearAll}>
          Clear saved items
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {savedItems.map((item) => (
          <article key={item.key} className="cren-surface p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
              <Link href={item.href} className="block no-underline">
                <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">{item.type}</span>
                <h2 className="mt-2 font-[family-name:var(--serif)] text-xl font-semibold leading-tight text-[color:var(--text-hero)]">
                  {item.label}
                </h2>
                {item.description && <p className="cren-body mt-2 text-sm">{item.description}</p>}
              </Link>
              <button type="button" className="focus-ring rounded-lg border border-[color:var(--border)] px-3 py-2 text-xs font-semibold" onClick={() => remove(item.key)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

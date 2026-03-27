"use client";

import { useState } from "react";
import { featuredAreas } from "@/lib/data";
import { trackEvent } from "@/lib/analytics-client";
import { SaveButton } from "@/components/save-button";

export function HeroSearchPreviewAside() {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [announcement, setAnnouncement] = useState("List view enabled");

  function updateMode(mode: "list" | "map") {
    setViewMode(mode);
    const message = mode === "map" ? "Map view enabled" : "List view enabled";
    setAnnouncement(message);
    trackEvent("view_item_list", { item_list_name: `hero_${mode}_view` });
  }

  const previewAreas = featuredAreas.slice(0, 4);

  return (
    <aside className="cren-soft p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Search preview</h2>
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          <button
            type="button"
            className={`focus-ring min-h-[44px] rounded-full px-4 text-sm font-medium ${viewMode === "list" ? "bg-accent text-primary" : "text-foreground"}`}
            aria-pressed={viewMode === "list"}
            onClick={() => updateMode("list")}
          >
            List
          </button>
          <button
            type="button"
            className={`focus-ring min-h-[44px] rounded-full px-4 text-sm font-medium ${viewMode === "map" ? "bg-accent text-primary" : "text-foreground"}`}
            aria-pressed={viewMode === "map"}
            onClick={() => updateMode("map")}
          >
            Map
          </button>
        </div>
      </div>

      <div className="h-44 overflow-hidden rounded-xl border border-dashed border-primary/25 bg-gradient-to-b from-accent to-card p-3">
        {viewMode === "map" ? (
          <div className="grid h-full grid-cols-2 gap-2">
            {previewAreas.map((a) => (
              <div key={a.slug} className="rounded-lg bg-card/90 p-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
                {a.name}
              </div>
            ))}
          </div>
        ) : (
          <ul className="flex h-full flex-col justify-center gap-2 text-xs text-foreground">
            {previewAreas.map((a) => (
              <li key={a.slug} className="flex items-center justify-between rounded-lg bg-card/90 px-3 py-2 shadow-sm backdrop-blur-sm">
                <span className="font-medium text-foreground">{a.name}</span>
                <span className="text-muted-foreground">Sample listings</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {viewMode === "map" ? "Neighborhood tiles show where coverage is concentrated." : "List layout for quick scanning across areas."}
        </p>
        <SaveButton itemId="hero-map-search" itemType="search" label="Save Search" />
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </aside>
  );
}

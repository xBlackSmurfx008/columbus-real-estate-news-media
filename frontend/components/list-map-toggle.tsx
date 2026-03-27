"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics-client";

export function ListMapToggle() {
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [announcement, setAnnouncement] = useState("Map view enabled");

  function updateMode(mode: "list" | "map") {
    setViewMode(mode);
    const message = mode === "map" ? "Map view enabled" : "List view enabled";
    setAnnouncement(message);
    trackEvent("view_item_list", { item_list_name: `hero_${mode}_view` });
  }

  return (
    <div>
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
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

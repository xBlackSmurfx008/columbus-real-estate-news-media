"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics-client";

type ViewItemTrackerProps = {
  itemId: string;
  itemCategory: string;
};

export function ViewItemTracker({ itemId, itemCategory }: ViewItemTrackerProps) {
  useEffect(() => {
    trackEvent("view_item", { item_id: itemId, item_category: itemCategory });
  }, [itemId, itemCategory]);

  return null;
}

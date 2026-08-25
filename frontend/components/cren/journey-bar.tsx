"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Rent", href: "/rent" },
  { label: "Buy", href: "/buy" },
  { label: "Sell", href: "/sell" },
  { label: "Own & Invest", href: "/invest" },
  { label: "Just Exploring", href: "/areas" },
];

function tabIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Renders in normal document flow. No portals, no position:fixed — the bar
// scrolls with the page like the rest of the header.
export function JourneyBar() {
  const pathname = usePathname();

  return (
    <div className="journey-bar" data-testid="journey-bar">
      <nav className="journey-tabs" aria-label="What are you planning?">
        <span className="journey-prompt">I’m planning to</span>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn("journey-tab", tabIsActive(pathname, tab.href) && "active")}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

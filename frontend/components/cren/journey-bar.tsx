"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "All Stories", href: "/blog", count: null as number | null },
  { label: "Rent", href: "/rent", count: 12 },
  { label: "Buy", href: "/buy", count: 18 },
  { label: "Invest", href: "/invest", count: 9 },
  { label: "Neighborhoods", href: "/areas", count: null },
  { label: "Development", href: "/topics/development", count: null },
  { label: "Market Data", href: "/market-data", count: null },
];

function tabIsActive(pathname: string, href: string) {
  if (href === "/blog") {
    return pathname === "/blog" || pathname.startsWith("/blog/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Renders in normal document flow. No portals, no position:fixed — the bar
// scrolls with the page like the rest of the header.
export function JourneyBar() {
  const pathname = usePathname();

  return (
    <div className="journey-bar" data-testid="journey-bar">
      <nav className="journey-tabs" aria-label="Story filters">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn("journey-tab", tabIsActive(pathname, tab.href) && "active")}
          >
            {tab.label}
            {tab.count != null ? <span className="tab-count">{tab.count}</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}

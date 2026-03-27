"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

export function JourneyBar() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const [slotHeight, setSlotHeight] = useState(72);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const sync = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0) setSlotHeight(h);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [pathname]);

  const pinnedBar = (
    <div ref={barRef} className="journey-bar journey-bar--pinned" data-testid="journey-bar">
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

  return (
    <>
      {mounted ? createPortal(pinnedBar, document.body) : null}
      <div
        className="journey-bar-slot"
        aria-hidden
        style={{ height: slotHeight }}
        data-testid="journey-bar-slot"
      />
    </>
  );
}

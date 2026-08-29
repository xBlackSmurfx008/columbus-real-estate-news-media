"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { JourneyBar } from "@/components/cren/journey-bar";

const navItems = [
  { href: "/", label: "Today" },
  { href: "/areas", label: "Explore Areas" },
  { href: "/market-data", label: "Market & Housing" },
  { href: "/things-to-do", label: "Things to Do" },
  { href: "/resources", label: "Resources" },
];

function formatTopbarDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date());
}

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const topbarDate = useMemo(() => formatTopbarDate(), []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="cren-header-sticky">
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-stat">
            <span className="label">Columbus housing and local living coverage</span>
          </div>
        </div>
        <div className="topbar-right">
          <span className="topbar-date" suppressHydrationWarning>{topbarDate}</span>
          <Link href="/market-data">Market Data</Link>
          <Link href="/advertise">Advertise</Link>
          <Link href="/subscribe">Subscribe</Link>
          <Link href="/profile">Profile</Link>
        </div>
      </div>

      <nav className="cren-site-nav" aria-label="Primary">
        <div className="nav-inner">
          <Link href="/" className="nav-brand" onClick={() => setMobileOpen(false)}>
            <div className="nav-brand-text">
              <span className="nav-brand-name">Columbus RE News</span>
              <span className="nav-brand-tag">Your City. Your Market.</span>
            </div>
          </Link>

          <div
            className={cn("nav-center", mobileOpen && "cren-mobile-nav-open")}
            id="cren-nav-center"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("nav-pill", isActive(item.href) && "active")}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="nav-right">
            <Link href="/search" className="nav-search" aria-label="Search CREN">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </Link>
            <Link href="/subscribe" className="btn-subscribe inline-flex items-center justify-center">
              Subscribe
            </Link>
            <Link href="/profile" className="nav-pill hidden md:inline-flex">Profile</Link>
            <button
              type="button"
              className="mobile-menu-btn"
              aria-expanded={mobileOpen}
              aria-controls="cren-nav-center"
              onClick={() => setMobileOpen((o) => !o)}
            >
              <span className="text-[13px] font-semibold tracking-wide">Menu</span>
            </button>
          </div>
        </div>
      </nav>
      <JourneyBar />
    </div>
  );
}

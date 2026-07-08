"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { JourneyBar } from "@/components/cren/journey-bar";
import { NewsTicker } from "@/components/cren/news-ticker";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Market News" },
  { href: "/advertise", label: "Advertise" },
  { href: "/subscribe", label: "Membership" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function formatTopbarDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
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
            <span className="label">Columbus Median:</span>
            <span className="value">$350,000</span>
            <span className="up">+4.3%</span>
          </div>
          <div className="topbar-stat">
            <span className="label">Active Listings:</span>
            <span className="value">5,223</span>
            <span className="up">+8.2%</span>
          </div>
          <div className="topbar-stat">
            <span className="label">Avg. DOM:</span>
            <span className="value">29 days</span>
          </div>
          <div className="topbar-stat">
            <span className="label">30-Yr Rate:</span>
            <span className="value">6.43%</span>
          </div>
        </div>
        <div className="topbar-right">
          <span className="topbar-date">{topbarDate}</span>
          <Link href="/advertise">Advertise</Link>
          <Link href="/subscribe">Subscribe</Link>
        </div>
      </div>

      <NewsTicker />

      <nav className="cren-site-nav" aria-label="Primary">
        <div className="nav-inner">
          <Link href="/" className="nav-brand" onClick={() => setMobileOpen(false)}>
            <div className="nav-brand-mark">C</div>
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
            <Link href="/areas" className="nav-search" aria-label="Search neighborhoods and areas">
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

import Link from "next/link";
import { SponsorSpotlight } from "@/components/sections/sponsor-spotlight";
import { topics } from "@/lib/data";
import { CrenPage } from "@/components/cren/cren-page";

const packages = [
  {
    name: "Starter Visibility",
    price: "$1,500",
    priceSuffix: "/ month",
    details: ["Area hub placement", "2 newsletter mentions", "Performance snapshot"],
    cta: "Inquire",
    href: "/contact?source=advertise-starter",
    featured: false,
  },
  {
    name: "Growth Partner",
    price: "$3,500",
    priceSuffix: "/ 90 days",
    details: ["Area + topic targeting", "Sponsored story", "Featured directory profile"],
    cta: "Book package",
    href: "/contact?source=advertise-growth",
    featured: true,
  },
  {
    name: "Category Leader",
    price: "Custom",
    priceSuffix: "",
    details: ["Exclusive topic sponsorship", "Co-branded campaign series", "Quarterly strategy review"],
    cta: "Contact sales",
    href: "/contact?source=advertise-custom",
    featured: false,
  },
];

export default function AdvertisePage() {
  const spotlightTopics = topics.slice(0, 3);

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Media Kit</div>
          <h1 className="cren-heading-xl">Advertise with precision in Columbus</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Reach readers through neighborhood and topic-aligned placements built for measurable outcomes.
          </p>
          <p className="cren-body mt-3 text-sm">
            Editorial or general questions?{" "}
            <Link href="/contact?source=advertise-page" className="cren-text-link">
              Contact
            </Link>
            .
          </p>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-num">10K+</div>
            <div className="stat-label">Newsletter subscribers</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">58%</div>
            <div className="stat-label">Email open rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">74%</div>
            <div className="stat-label">Columbus metro audience</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">$285K</div>
            <div className="stat-label">Avg reader income</div>
          </div>
        </div>

        <div className="ad-grid">
          {packages.map((item) => (
            <div key={item.name} className={`ad-card ${item.featured ? "is-featured" : ""}`}>
              <div className="ad-card-header">
                <div>
                  <div className="ad-card-name">{item.name}</div>
                  <div className="text-[13px] text-[color:var(--text-muted)] mt-0.5">Columbus RE News placements</div>
                </div>
                <div className="ad-card-price">
                  {item.price}
                  {item.priceSuffix ? <small>{item.priceSuffix}</small> : null}
                </div>
              </div>
              <ul className="ad-features">
                {item.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              <Link href={item.href} className={`price-btn w-full text-center ${item.featured ? "price-btn-primary" : "price-btn-outline"}`}>
                {item.cta}
              </Link>
            </div>
          ))}
        </div>

        <SponsorSpotlight topics={spotlightTopics} />
      </div>
    </CrenPage>
  );
}

import Link from "next/link";
import { SponsorSpotlight } from "@/components/sections/sponsor-spotlight";
import { topics } from "@/lib/data";
import { CrenPage } from "@/components/cren/cren-page";
import { AdvertisingInquiryForm } from "@/components/advertising-inquiry-form";

const packages = [
  {
    name: "Starter Visibility",
    price: "$1,500",
    priceSuffix: "/ month",
    details: ["Area hub placement", "2 newsletter mentions", "Performance snapshot"],
    cta: "Inquire",
    href: "#advertising-inquiry",
    featured: false,
  },
  {
    name: "Growth Partner",
    price: "$3,500",
    priceSuffix: "/ 90 days",
    details: ["Area + topic targeting", "Sponsored story", "Featured directory profile"],
    cta: "Book package",
    href: "#advertising-inquiry",
    featured: true,
  },
  {
    name: "Category Leader",
    price: "Custom",
    priceSuffix: "",
    details: ["Exclusive topic sponsorship", "Co-branded campaign series", "Quarterly strategy review"],
    cta: "Contact sales",
    href: "#advertising-inquiry",
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
            <div className="stat-num">Local</div>
            <div className="stat-label">Central Ohio audience</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">Relevant</div>
            <div className="stat-label">Topic-aligned placement</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">Clear</div>
            <div className="stat-label">Sponsor disclosure</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">Measured</div>
            <div className="stat-label">Performance snapshot</div>
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

        <section className="cren-surface p-6 md:p-8" id="advertising-inquiry">
          <div className="section-eyebrow">Advertising inquiry</div>
          <h2 className="cren-heading-lg">Tell us what you want to reach</h2>
          <p className="cren-body mt-2 mb-6 max-w-2xl">
            Share the audience, package, and outcome you have in mind. Your inquiry is stored in the newsroom queue and sends an immediate Telegram alert to the publisher.
          </p>
          <AdvertisingInquiryForm />
        </section>
      </div>
    </CrenPage>
  );
}

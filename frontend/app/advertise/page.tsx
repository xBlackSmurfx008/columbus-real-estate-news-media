import Link from "next/link";
import { SponsorSpotlight } from "@/components/sections/sponsor-spotlight";
import { topics } from "@/lib/data";
import { CrenPage } from "@/components/cren/cren-page";
import { AdvertisingInquiryForm } from "@/components/advertising-inquiry-form";
import { FIRST_DIRECTORY_PILOT_PACKAGE, SPONSOR_PACKAGE_DEFINITIONS } from "@/lib/directory-sponsorship";

export default function AdvertisePage() {
  const spotlightTopics = topics.slice(0, 3);

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Media Kit</div>
          <h1 className="cren-heading-xl">Advertise with precision in Columbus</h1>
          <p className="cren-body mt-2 max-w-2xl">
            Reach readers through labeled neighborhood, newsletter, service-guide, and directory placements built for measurable outcomes.
          </p>
          <p className="cren-body mt-3 text-sm">
            Editorial or general questions?{" "}
            <Link href="/contact?source=advertise-page" className="cren-text-link">
              Contact
            </Link>
            . Advertising can buy labeled distribution and directory visibility; it cannot buy newsroom coverage, rankings, conclusions, or editorial recommendations. Directory and service-guide packages follow{" "}
            <Link href="/directory/sponsor-rules" className="cren-text-link">
              sponsor-safe rules
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
          {SPONSOR_PACKAGE_DEFINITIONS.map((item) => (
            <div key={item.name} className={`ad-card ${item.name === "Category Service Guide Pilot" ? "is-featured" : ""}`}>
              <div className="ad-card-header">
                <div>
                  <div className="ad-card-name">{item.name}</div>
                  <div className="text-[13px] text-[color:var(--text-muted)] mt-0.5">{item.bestFor}</div>
                </div>
                <div className="ad-card-price">
                  {item.price}
                  <small>{item.term}</small>
                </div>
              </div>
              <ul className="ad-features">
                {item.deliverables.slice(0, 4).map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-[color:var(--text-muted)]">Labels: {item.labels.join(", ")}</p>
              <Link href="#advertising-inquiry" className={`price-btn w-full text-center ${item.name === "Category Service Guide Pilot" ? "price-btn-primary" : "price-btn-outline"}`}>
                Inquire
              </Link>
            </div>
          ))}
        </div>

        <section className="cren-surface p-6 md:p-8">
          <div className="section-eyebrow">First pilot</div>
          <h2 className="cren-heading-lg">{FIRST_DIRECTORY_PILOT_PACKAGE.name}</h2>
          <p className="cren-body mt-2 max-w-3xl text-sm">{FIRST_DIRECTORY_PILOT_PACKAGE.readerJob}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="cren-soft p-4 text-sm"><strong>Category:</strong><span className="mt-1 block text-[color:var(--text-secondary)]">{FIRST_DIRECTORY_PILOT_PACKAGE.category}</span></div>
            <div className="cren-soft p-4 text-sm"><strong>Area:</strong><span className="mt-1 block text-[color:var(--text-secondary)]">{FIRST_DIRECTORY_PILOT_PACKAGE.area}</span></div>
            <div className="cren-soft p-4 text-sm"><strong>Term:</strong><span className="mt-1 block text-[color:var(--text-secondary)]">{FIRST_DIRECTORY_PILOT_PACKAGE.term}</span></div>
            <div className="cren-soft p-4 text-sm"><strong>Rate:</strong><span className="mt-1 block text-[color:var(--text-secondary)]">{FIRST_DIRECTORY_PILOT_PACKAGE.rate}</span></div>
          </div>
          <Link href="/directory/sponsor-rules" className="cren-text-link mt-4 inline-block text-sm font-semibold">
            Review pilot rules and reporting example
          </Link>
        </section>

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

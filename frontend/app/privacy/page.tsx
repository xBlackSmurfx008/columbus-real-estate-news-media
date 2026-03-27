import Link from "next/link";
import { CrenPage } from "@/components/cren/cren-page";

export default function PrivacyPage() {
  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div className="cren-surface p-8">
          <div className="section-eyebrow">Legal</div>
          <h1 className="cren-heading-xl">Privacy &amp; consent</h1>
          <p className="cren-body mt-2 max-w-2xl">
            We collect first-party data to improve content relevance and provide aggregate audience insights to advertisers. This
            summary complements your experience on Columbus Real Estate News; it is not a substitute for formal legal review.
          </p>
        </div>

        <div className="cren-surface p-6 md:p-8">
          <h2 className="cren-heading-lg">What we collect</h2>
          <ul className="cren-body mt-3 list-inside list-disc space-y-2 text-sm">
            <li>Page and engagement events (page views, scroll depth, CTA clicks) where implemented</li>
            <li>Subscription preferences (area, topic, email cadence) when you sign up</li>
            <li>Information you submit through contact or other forms</li>
          </ul>

          <h2 className="cren-heading-lg mt-8">How data is used</h2>
          <ul className="cren-body mt-3 list-inside list-disc space-y-2 text-sm">
            <li>Personalization of newsletter and area/topic updates</li>
            <li>Audience segmentation and reporting in aggregate for sponsors</li>
            <li>Campaign and content performance measurement</li>
          </ul>

          <h2 className="cren-heading-lg mt-8">Your choices</h2>
          <ul className="cren-body mt-3 list-inside list-disc space-y-2 text-sm">
            <li>Unsubscribe any time using links in email</li>
            <li>
              Request changes or removal of information via{" "}
              <Link href="/contact?source=privacy" className="cren-text-link">
                Contact
              </Link>
            </li>
          </ul>

          <p className="cren-body mt-8 text-xs">Last updated: March 2026</p>
        </div>
      </div>
    </CrenPage>
  );
}

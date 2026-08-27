import type { Metadata } from "next";
import { CrenPage } from "@/components/cren/cren-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for Columbus Real Estate News.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <CrenPage narrow>
      <div className="cren-stack-lg">
        <section className="cren-surface p-8">
          <div className="section-eyebrow">Terms</div>
          <h1 className="cren-heading-xl">Terms of Use</h1>
          <p className="cren-body mt-3 max-w-3xl">
            Columbus Real Estate News provides editorial reporting, guides, and tools for general information only.
            Content is published as a public service and is not legal, financial, tax, or real-estate advice.
          </p>
          <p className="cren-body mt-4 max-w-3xl">
            Sponsored placements, affiliate links, and directory submissions are labeled when present. Readers should
            verify listings, pricing, permissions, and official records independently before acting.
          </p>
          <p className="cren-body mt-4 max-w-3xl">
            For questions about corrections, privacy, or advertising, use the contact page.
          </p>
        </section>
      </div>
    </CrenPage>
  );
}

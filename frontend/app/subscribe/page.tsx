import type { Metadata } from "next";
import Link from "next/link";
import { SubscribeForm } from "@/components/subscribe-form";
import { CrenPage } from "@/components/cren/cren-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/subscribe",
  title: "Follow Your Part of Columbus, Free",
  description:
    "Your email and your Columbus area — that is the whole signup. Free membership on a local newsroom that reads the permits, county records, and market reports.",
});

type SubscribePageProps = {
  searchParams: Promise<{
    source?: string | string[];
    email?: string | string[];
    area?: string | string[];
    topic?: string | string[];
  }>;
};

function firstParam(value?: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function SubscribePage({ searchParams }: SubscribePageProps) {
  const params = await searchParams;
  const source = firstParam(params.source) || "direct";
  const initialEmail = firstParam(params.email);
  const initialArea = firstParam(params.area);
  const initialTopic = firstParam(params.topic) || "Area Alerts";

  return (
    <CrenPage narrow>
      <div className="cren-surface p-8">
        <div className="section-eyebrow">Membership</div>
        <h1 className="cren-heading-xl">Follow your part of Columbus. Free.</h1>
        <p className="cren-body mt-2">
          Your email and your area. That is the whole signup. You get a member spot on the Columbus real estate news
          desk that reads the permits, the county records, and the market reports so you do not have to.
        </p>

        <SubscribeForm source={source} initialEmail={initialEmail} initialArea={initialArea} initialTopic={initialTopic} />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[var(--radius)] border border-[color:var(--border)] p-4">
            <h2 className="font-semibold text-[color:var(--text-hero)]">What it costs you</h2>
            <p className="cren-body mt-1 text-sm">Nothing. Membership is free and there is no paid tier to upgrade to today.</p>
          </div>
          <div className="rounded-[var(--radius)] border border-[color:var(--border)] p-4">
            <h2 className="font-semibold text-[color:var(--text-hero)]">How much email</h2>
            <p className="cren-body mt-1 text-sm">
              Straight answer: we have not sent a member email yet. We are building it. You will hear from us before the
              first one goes out, and you can leave with one click.
            </p>
          </div>
          <div className="rounded-[var(--radius)] border border-[color:var(--border)] p-4">
            <h2 className="font-semibold text-[color:var(--text-hero)]">Who sees your email</h2>
            <p className="cren-body mt-1 text-sm">
              The CREN newsroom. We do not sell contact lists. See our{" "}
              <Link href="/privacy" className="cren-text-link">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <p className="cren-body mt-6 text-xs">
          We use what you tell us to aim coverage and email at your situation. See{" "}
          <Link href="/privacy" className="cren-text-link">
            Privacy &amp; consent
          </Link>{" "}
          and our{" "}
          <Link href="/communications-policy" className="cren-text-link">
            Communications Policy
          </Link>{" "}
          for details.
        </p>
      </div>
    </CrenPage>
  );
}

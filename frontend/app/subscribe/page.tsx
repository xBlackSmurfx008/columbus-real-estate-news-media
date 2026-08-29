import Link from "next/link";
import { SubscribeForm } from "@/components/subscribe-form";
import { CrenPage } from "@/components/cren/cren-page";

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
        <h1 className="cren-heading-xl">Follow your area and topics</h1>
        <p className="cren-body mt-2">
          Tell us where you care about and what you want to track. You will get one weekly Columbus brief with market movement,
          neighborhood notes, and practical next steps—tailored to your picks.
        </p>

        <SubscribeForm source={source} initialEmail={initialEmail} initialArea={initialArea} initialTopic={initialTopic} />

        <p className="cren-body mt-8 text-xs">
          We use your preferences to personalize email only. See{" "}
          <Link href="/privacy" className="cren-text-link">
            Privacy &amp; consent
          </Link>{" "}
          for details.
        </p>
      </div>
    </CrenPage>
  );
}

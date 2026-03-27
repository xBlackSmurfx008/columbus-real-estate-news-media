import Link from "next/link";
import { SubscribeForm } from "@/components/subscribe-form";
import { CrenPage } from "@/components/cren/cren-page";

export default function SubscribePage({ searchParams }: { searchParams?: { source?: string } }) {
  const source = searchParams?.source ?? "direct";

  return (
    <CrenPage narrow>
      <div className="cren-surface p-8">
        <div className="section-eyebrow">Membership</div>
        <h1 className="cren-heading-xl">Follow your area and topics</h1>
        <p className="cren-body mt-2">
          Tell us where you care about and what you want to track. You will get one weekly Columbus brief with market movement,
          neighborhood notes, and practical next steps—tailored to your picks.
        </p>

        <SubscribeForm source={source} />

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

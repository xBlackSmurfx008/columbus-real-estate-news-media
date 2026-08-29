import { ContactForm } from "@/components/contact-form";
import { CrenPage } from "@/components/cren/cren-page";

type ContactPageProps = {
  searchParams: Promise<{ source?: string }>;
};

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const source = params.source ?? "direct";

  return (
    <CrenPage narrow>
      <div className="cren-surface p-8">
        <div className="section-eyebrow">Get In Touch</div>
        <h1 className="cren-heading-xl">Contact</h1>
        <p className="cren-body mt-2">
          Editorial tips, corrections, partnerships, and general questions. Advertising and sponsorship inquiries should start with
          the Advertise page so we can match you to the right package.
        </p>

        <ContactForm source={source} />
      </div>
    </CrenPage>
  );
}

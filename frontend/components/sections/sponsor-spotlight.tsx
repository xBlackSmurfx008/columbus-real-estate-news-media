import Link from "next/link";
import { TopicCard } from "@/components/cards";
import type { Topic } from "@/lib/types";

type SponsorSpotlightProps = {
  topics: Topic[];
};

export function SponsorSpotlight({ topics }: SponsorSpotlightProps) {
  return (
    <section data-section-id="sponsor-spotlight" className="cren-surface p-6 md:p-8">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h2 className="cren-heading-lg">Sponsor spotlight</h2>
        <Link href="/advertise" className="cren-text-link text-sm">
          Become a founding sponsor
        </Link>
      </div>
      <p className="cren-body mb-6 max-w-2xl text-sm">
        Topic-aligned placements reach readers when they are researching schools, development, market trends, and lifestyle.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {topics.map((topic) => (
          <TopicCard key={topic.slug} topic={topic} />
        ))}
      </div>
    </section>
  );
}

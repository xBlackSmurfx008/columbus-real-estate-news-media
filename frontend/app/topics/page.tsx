import type { Metadata } from 'next';
import { TopicCard } from "@/components/cards";
import { priorityTopicHubs, topics } from "@/lib/data";
import { CrenPage } from "@/components/cren/cren-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/topics",
  title: "Columbus Real Estate & Local Living Topics",
  description:
    "Browse Columbus reporting by topic: market trends, schools, development, local politics, events, restaurants, and neighborhood lifestyle coverage.",
});

export default function TopicsPage() {
  const prioritized = topics.filter((topic) => priorityTopicHubs.includes(topic.slug));

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <div>
          <div className="section-eyebrow">Topics</div>
          <h1 className="cren-heading-xl mb-2">Topic Hubs</h1>
          <p className="cren-body mb-6">Organized by market trends, schools, development, policy, and lifestyle.</p>
        </div>

        <div className="cren-surface p-6 md:p-8">
          <h2 className="cren-heading-lg">Priority launch hubs (first 3)</h2>
          <p className="cren-body mt-2 text-sm">
            These three topic hubs are prioritized for search and editorial growth in phase one.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {prioritized.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} />
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topics.map((topic) => (
            <TopicCard key={topic.slug} topic={topic} />
          ))}
        </div>
      </div>
    </CrenPage>
  );
}

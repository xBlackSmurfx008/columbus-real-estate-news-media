import Link from "next/link";
import Image from "next/image";
import { Area, ContentItem, Topic } from "@/lib/types";
import { SaveButton } from "@/components/save-button";
import { Badge } from "@/components/ui/badge";
import { getTopicBySlug } from "@/lib/data";
const STORY_PLACEHOLDER =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=640&q=70&auto=format&fit=crop";

export function AreaCard({ area }: { area: Area }) {
  return (
    <article
      className="group cren-surface p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-hover)]"
      data-item-type="area"
      data-item-id={area.slug}
    >
      <Link href={`/areas/${area.slug}`} className="block text-inherit no-underline">
        <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-[var(--radius-sm)] bg-[color:var(--green-pale)]">
          <div
            className="h-full w-full bg-gradient-to-br from-[color:var(--green)]/20 via-transparent to-transparent transition-transform duration-300 group-hover:scale-105"
            aria-hidden
          />
        </div>
        <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)] transition-colors group-hover:text-[color:var(--green)]">
          {area.name}
        </h3>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{area.description}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">{area.populationSignal}</p>
      </Link>
      <div className="mt-3">
        <SaveButton itemId={area.slug} itemType="area" />
      </div>
    </article>
  );
}

export function TopicCard({ topic }: { topic: Topic }) {
  return (
    <article
      className="group cren-surface p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-hover)]"
      data-item-type="topic"
      data-item-id={topic.slug}
    >
      <Link href={`/topics/${topic.slug}`} className="block text-inherit no-underline">
        <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-[var(--radius-sm)] bg-[color:var(--green-pale)]">
          <div
            className="h-full w-full bg-gradient-to-br from-[color:var(--green)]/25 to-transparent transition-transform duration-300 group-hover:scale-105"
            aria-hidden
          />
        </div>
        <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)] transition-colors group-hover:text-[color:var(--green)]">
          {topic.name}
        </h3>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{topic.description}</p>
        <div className="mt-3">
          <Badge variant="outline" className="border-[color:var(--border)] text-[color:var(--text-secondary)]">
            Topic hub
          </Badge>
        </div>
      </Link>
      <div className="mt-3">
        <SaveButton itemId={topic.slug} itemType="topic" />
      </div>
    </article>
  );
}

export function StoryCard({ item }: { item: ContentItem }) {
  const topic = getTopicBySlug(item.topicSlug);

  return (
    <article
      className="group cren-surface p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-hover)]"
      data-item-type="article"
      data-item-id={item.slug}
    >
      <Link href={`/blog/${item.slug}`} className="block text-inherit no-underline">
        <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-[var(--radius-sm)] bg-[color:var(--green-pale)]">
          <Image
            src={STORY_PLACEHOLDER}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="primary">{topic?.name ?? item.topicSlug}</Badge>
          <span className="text-xs uppercase tracking-wide text-[color:var(--text-muted)]">{item.format}</span>
        </div>
        <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)] transition-colors group-hover:text-[color:var(--green)]">
          {item.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-[color:var(--text-secondary)]">{item.excerpt}</p>
        <p className="mt-3 text-xs uppercase tracking-wide text-[color:var(--text-muted)]">Published {item.date}</p>
      </Link>
      <div className="mt-3">
        <SaveButton itemId={item.slug} itemType="article" />
      </div>
    </article>
  );
}

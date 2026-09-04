import type { Metadata } from "next";
import { CrenPage } from "@/components/cren/cren-page";
import { SavedItemsPanel, type SavedItemReference } from "@/components/saved-items-panel";
import { getArticlePath } from "@/lib/article-routing";
import { allStoryItems, areas, topics } from "@/lib/data";
import { getPublicData } from "@/lib/public-data";
import { pageMetadata } from "@/lib/page-metadata";

// Per-visitor page: everything below is read from this browser's localStorage,
// so there is no stable public document to index. noindex, and absent from
// app/sitemap.ts.
export const metadata: Metadata = pageMetadata({
  path: "/saved",
  title: "Saved Columbus Areas, Topics and Stories",
  description:
    "Review the Columbus neighborhoods, topics, stories, and searches you saved on Columbus Real Estate News. Saved items stay in this browser only.",
  noindex: true,
});

export default async function SavedPage() {
  const data = await getPublicData();
  const items = new Map<string, SavedItemReference>();

  for (const area of areas) {
    items.set(`area:${area.slug}`, {
      key: `area:${area.slug}`,
      label: area.name,
      href: `/areas/${area.slug}`,
      type: "area",
      description: area.description,
    });
  }

  for (const topic of topics) {
    items.set(`topic:${topic.slug}`, {
      key: `topic:${topic.slug}`,
      label: topic.name,
      href: `/topics/${topic.slug}`,
      type: "topic",
      description: topic.description,
    });
  }

  for (const item of allStoryItems) {
    items.set(`article:${item.slug}`, {
      key: `article:${item.slug}`,
      label: item.title,
      href: `/blog/${item.slug}`,
      type: "article",
      description: item.excerpt,
    });
  }

  for (const article of data.articles) {
    items.set(`article:${article.id}`, {
      key: `article:${article.id}`,
      label: article.title,
      href: getArticlePath(article),
      type: "article",
      description: article.excerpt ?? undefined,
    });
  }

  items.set("search:hero-map-search", {
    key: "search:hero-map-search",
    label: "Homepage area search preview",
    href: "/search",
    type: "search",
    description: "Return to CREN search and area discovery.",
  });

  return (
    <CrenPage>
      <div className="cren-stack-lg">
        <header className="cren-surface p-6 md:p-8">
          <p className="section-eyebrow">My CREN Brief</p>
          <h1 className="cren-heading-xl">Saved items</h1>
          <p className="cren-body mt-2 max-w-3xl">
            Saved items stay in this browser. Subscribe when you want CREN to turn a saved place, topic, or search into ongoing updates.
          </p>
        </header>

        <SavedItemsPanel items={[...items.values()]} />
      </div>
    </CrenPage>
  );
}

import Link from "next/link";
import { allStoryItems, areas, topics } from "@/lib/data";
import { GlobalSearchCombobox } from "@/components/global-search-combobox";
import { HeroSearchPreviewAside } from "@/components/hero-search-preview-aside";

export function Hero() {
  const searchSuggestions = [
    ...areas.map((area) => ({ id: `area-${area.slug}`, label: area.name, href: `/areas/${area.slug}`, type: "area" as const })),
    ...topics.map((topic) => ({ id: `topic-${topic.slug}`, label: topic.name, href: `/topics/${topic.slug}`, type: "topic" as const })),
    ...allStoryItems.map((story) => ({ id: `story-${story.slug}`, label: story.title, href: `/blog/${story.slug}`, type: "article" as const })),
  ];

  return (
    <section className="cren-surface overflow-hidden p-6 md:p-8" data-section-id="hero-search">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">Columbus Real Estate Intelligence</p>
      <h1 className="mt-2 max-w-4xl text-3xl font-semibold leading-tight text-foreground md:text-5xl">
        Search neighborhoods, compare trends, and decide faster.
      </h1>
      <p className="mt-3 max-w-3xl text-base text-muted-foreground">
        Professional local data and friendly guidance inspired by top real-estate platforms, tailored for Columbus.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/buy"
          className="focus-ring rounded-full border border-border bg-accent px-4 py-2 text-sm font-medium text-primary"
        >
          Buy
        </Link>
        <Link
          href="/sell"
          className="focus-ring rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground"
        >
          Sell
        </Link>
        <Link
          href="/rent"
          className="focus-ring rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground"
        >
          Rent
        </Link>
        <Link
          href="/invest"
          className="focus-ring rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground"
        >
          Invest
        </Link>
        <Link
          href="/improve"
          className="focus-ring rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground"
        >
          Improve it
        </Link>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="cren-soft p-4 md:p-5">
          <GlobalSearchCombobox
            id="hero-search-input"
            placeholder="Search Columbus, Dublin, Westerville, or schools"
            suggestions={searchSuggestions}
            submitHref="/areas"
            submitLabel="Search Columbus"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {["Price", "Beds", "Home Type", "More Filters"].map((chip) => (
              <button
                key={chip}
                type="button"
                disabled
                title="Listing filters are coming soon"
                className="cursor-not-allowed rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {chip}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Advanced listing filters are on the roadmap—use search and area hubs for now.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/subscribe?source=hero"
              className="focus-ring rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground"
            >
              Get Weekly Alerts
            </Link>
            <Link
              href="/market-data"
              className="focus-ring rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground"
            >
              View Market Data
            </Link>
          </div>
        </div>

        <HeroSearchPreviewAside />
      </div>
    </section>
  );
}

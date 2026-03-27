import Link from "next/link";
import { BlogPost } from "@/lib/types";
import { ViewItemTracker } from "@/components/view-item-tracker";

export function BlogArticleTemplate({ post }: { post: BlogPost }) {
  return (
    <article className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <ViewItemTracker itemId={post.slug} itemCategory="article" />
      <div className="cren-stack">
        <header className="cren-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--green)]">
            {post.format} | {post.readTimeMinutes} min read
          </p>
          <h1 className="cren-heading-xl mt-2">{post.title}</h1>
          <p className="cren-body mt-3">{post.introHook}</p>
        </header>

        <section className="cren-surface p-6">
          <h2 className="cren-heading-lg">What changed this week/month</h2>
          <ul className="cren-body mt-3 space-y-2">
            {post.whatChanged.map((point) => (
              <li key={point}>- {point}</li>
            ))}
          </ul>
        </section>

        <section className="cren-surface p-6">
          <h2 className="cren-heading-lg">What this means for renters, buyers, and sellers</h2>
          <div className="cren-body mt-4 space-y-3">
            <p>
              <span className="font-semibold text-[color:var(--text-hero)]">Renters:</span> {post.whatItMeans.renters}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--text-hero)]">Buyers:</span> {post.whatItMeans.buyers}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--text-hero)]">Sellers:</span> {post.whatItMeans.sellers}
            </p>
          </div>
        </section>

        <section className="cren-surface p-6">
          <h2 className="cren-heading-lg">Best neighborhoods/options right now</h2>
          <ul className="cren-body mt-3 space-y-2">
            {post.bestNeighborhoods.map((area) => (
              <li key={area}>- {area}</li>
            ))}
          </ul>
        </section>

        <section className="cren-surface p-6">
          <h2 className="cren-heading-lg">Action checklist</h2>
          <ul className="cren-body mt-3 space-y-2">
            {post.actionChecklist.map((step) => (
              <li key={step}>- {step}</li>
            ))}
          </ul>
        </section>

        <section className="cren-surface p-6">
          <h2 className="cren-heading-lg">Sources and methodology</h2>
          <ul className="cren-body mt-3 space-y-2">
            {post.sourcesAndMethodology.map((source) => (
              <li key={source}>- {source}</li>
            ))}
          </ul>
        </section>

        <section className="cren-surface p-6" data-section-id="blog-cta">
          <h2 className="cren-heading-lg text-[length:1.25rem]">Next step</h2>
          <p className="cren-body mt-2">Get tailored updates by area and topic so you can act with confidence.</p>
          <Link href={post.cta.href} className="cren-btn cren-btn-primary mt-4 inline-flex">
            {post.cta.label}
          </Link>
        </section>
      </div>

      <aside className="cren-surface h-fit p-5 lg:sticky lg:top-24">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Related reads</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {post.internalLinks.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="cren-text-link font-medium transition hover:opacity-90">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </article>
  );
}

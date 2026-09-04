"use client";

import Link from "next/link";
import { CoverImage } from "@/components/cren/cover-image";
import { bylineInitials, type ArticleCardData } from "@/lib/article-card";

// A client component on purpose, and it is a performance fix rather than an
// interactivity one.
//
// A server component's rendered element tree is serialized into the RSC flight
// payload embedded in the HTML, so every card was paid for twice: once as
// markup and once as ~2.5KB of JSON describing the same markup. Across 95
// articles that was 242KB of the /blog page's 643KB. A client component ships
// its PROPS instead — the ten fields in ArticleCardData — so the same card
// costs about 400 bytes on the wire. The server-rendered HTML is identical;
// nothing about what the reader sees, or when they see it, changes.
export function ArticleCard({ article, featured = false }: { article: ArticleCardData; featured?: boolean }) {
  return (
    <Link href={article.href} className="block no-underline group">
      <article
        className="cren-surface p-6 transition-shadow duration-300 hover:shadow-[var(--shadow-hover)]"
        data-item-type="article"
        data-item-id={article.id}
      >
        {article.imageUrl ? (
          <div className={`relative mb-4 overflow-hidden rounded-[var(--radius-sm)] ${featured ? "aspect-[16/8]" : "aspect-[16/9]"}`}>
            <CoverImage
              src={article.imageUrl}
              alt={article.title}
              thumbnail
              aspect={featured ? 2 : 16 / 9}
            />
          </div>
        ) : (
          featured && (
            <div className="mb-4 aspect-[16/8] overflow-hidden rounded-[var(--radius-sm)] bg-gradient-to-br from-[color:var(--green)]/15 via-[color:var(--gold)]/10 to-transparent" />
          )
        )}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full bg-[color:var(--green)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--green)]">
            {article.category}
          </span>
          {article.featured && (
            <span className="inline-block rounded-full bg-[color:var(--gold)]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--gold)]">
              Featured
            </span>
          )}
        </div>
        <h3 className="font-[family-name:var(--serif)] text-lg font-semibold text-[color:var(--text-hero)] transition-colors group-hover:text-[color:var(--green)]">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm text-[color:var(--text-secondary)]">{article.excerpt}</p>
        )}
        <div className="mt-4 flex items-center gap-3 text-xs text-[color:var(--text-muted)]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--green)] text-[10px] font-bold text-white">
            {bylineInitials(article.author)}
          </div>
          <span className="font-medium text-[color:var(--text-secondary)]">{article.author}</span>
          <span>·</span>
          <span>{article.date}</span>
          <span>·</span>
          <span>{article.readTime}</span>
        </div>
      </article>
    </Link>
  );
}

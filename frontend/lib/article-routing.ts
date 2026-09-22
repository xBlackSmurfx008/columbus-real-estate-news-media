/** Fields required to build a public article URL. */
export interface ArticleRoutingFields {
  title: string;
  canonical_slug?: string | null;
}

/** Verified same-story aliases; never redirect an unknown project to a merely similar one. */
export const LEGACY_ARTICLE_SLUG_REDIRECTS: Readonly<Record<string, string>> = Object.freeze({
  'columbus-zone-in-phase-2-commercial-industrial-rezoning': 'zone-in-adds-capacity-not-88-000-built-columbus-homes',
  'columbus-zone-in-phase-2-public-comment': 'columbus-zone-in-phase-2-draft-releases-public-comment-opens-aug-25',
  'second-baptist-church-near-east-side-rfp': 'second-baptist-opens-2-4-acres-on-columbus-near-east-side-to-developers',
  'nrp-group-breaks-ground-on-336-unit-columbus-apartments': 'nrp-group-breaks-ground-on-336-unit-osu-east-apartments-in-columbus',
  'discovery-district-parking-lots-518-apartments-96-million': 'columbus-discovery-district-deal-authorizes-talks-not-construction',
  'columbus-olde-towne-east-gets-65-unit-affordable-project-on-e-main': 'mercy-on-main-wins-conditional-credits-for-65-columbus-homes',
  'downtown-columbus-merchant-building-fall-2026-opening': 'columbus-north-market-tower-program-now-lists-142-residences',
});

/** Convert a headline into a readable URL segment. */
export function generateArticleSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

/** Return the immutable database slug, with a legacy title fallback. */
export function getArticleSlug(article: ArticleRoutingFields): string {
  return article.canonical_slug || generateArticleSlug(article.title);
}

/** Return the canonical public path for an article. */
export function getArticlePath(article: ArticleRoutingFields): string {
  return `/blog/${getArticleSlug(article)}`;
}

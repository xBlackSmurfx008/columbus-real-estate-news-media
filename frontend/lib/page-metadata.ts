import type { Metadata } from 'next';
import { absoluteUrl } from './site.ts';

// One place that builds the head of every hand-authored page.
//
// Why this exists (site quality gate, 2026-09-04): thirteen indexable pages
// shipped with no <link rel="canonical"> at all, seven of them shared the root
// layout's default title AND description verbatim, and six more appended the
// brand a second time on top of the layout's `%s | Columbus Real Estate News`
// template. All three are the same defect — metadata written per page, by hand,
// in three different shapes. A helper makes the correct shape the cheap one.
//
// Rules encoded here:
//  - `title` is the bare page title. `renderTitle` decides whether the brand
//    suffix fits and emits an absolute <title>, so never write the brand twice.
//  - the canonical is always absolute and always self-referencing, built from
//    `absoluteUrl` so there is one definition of the site origin.
//  - per-visitor utility pages pass `noindex: true`. Those pages must also stay
//    out of `app/sitemap.ts`; `tests/seo-metadata.test.mjs` fails the build if
//    a noindex path is listed there.

export type PageMetadataInput = {
  /** Site-root-relative path, e.g. `/sell/your-home`. */
  path: string;
  /** Page title WITHOUT the brand suffix — `renderTitle` appends it when it fits. */
  title: string;
  /** Meta description. CLAUDE.md's SEO convention is 140-165 characters. */
  description: string;
  /** Per-visitor utility pages: noindex, follow, and absent from the sitemap. */
  noindex?: boolean;
};

/** CLAUDE.md's meta-description convention. */
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 165;

/** The brand a rendered <title> carries whenever there is room for it. */
export const TITLE_SUFFIX = ' | Columbus Real Estate News';

/**
 * Bing Webmaster Tools' SEO analyzer fails any <title> over 65 characters
 * (rule SEO050, "Title too long"). Its 2026-09-15 scan of the site flagged 149
 * pages: every article, 27 area hubs and a dozen hand-authored pages. The
 * previous ceiling here was 75, and the 28-character brand suffix made even
 * that unreachable for any headline longer than 37 characters.
 */
export const TITLE_MAX = 65;
/** Below roughly 25 characters Bing may substitute a heading for the title. */
export const TITLE_MIN = 30;

function normalise(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * The exact <title> a page serves, from its bare title:
 *  1. `${title} | Columbus Real Estate News` when that fits in TITLE_MAX;
 *  2. the bare title when only it fits — the brand still reaches the crawler
 *     through og:site_name and the publisher schema, and result pages show the
 *     site name on their own;
 *  3. a shortened title as a last resort: cut at a clause break (" — ", ": ",
 *     ", ") when the leading clause keeps at least 60% of the budget, else at
 *     a word boundary with an ellipsis. The h1 and og:title keep the full
 *     headline; only the browser/SERP title is shortened.
 */
export function renderTitle(title: string): string {
  const base = normalise(title);
  if (base.length + TITLE_SUFFIX.length <= TITLE_MAX) return `${base}${TITLE_SUFFIX}`;
  if (base.length <= TITLE_MAX) return base;
  return truncateTitle(base, TITLE_MAX);
}

/**
 * Next.js `title` value that bypasses the root layout's `%s | brand` template.
 * `renderTitle` has already decided whether the brand fits, so the template
 * must not append it a second time.
 */
export function titleMetadata(title: string): { absolute: string } {
  return { absolute: renderTitle(title) };
}

/**
 * Longest candidate title that fits WITH the brand suffix; failing that, the
 * longest that fits on its own; failing that, the last (shortest) candidate.
 * Generated hubs interpolate a place name, so a template that is comfortable
 * for "Bexley" runs past the limit for "The Ohio State University area"; this
 * picks a shorter phrasing for the long names instead of letting the results
 * page cut one.
 */
export function composeTitle(candidates: string[]): string {
  const cleaned = candidates.map(normalise);
  const longest = (fits: (candidate: string) => boolean) =>
    cleaned.filter(fits).sort((a, b) => b.length - a.length)[0];
  return (
    longest((candidate) => candidate.length + TITLE_SUFFIX.length <= TITLE_MAX) ??
    longest((candidate) => candidate.length <= TITLE_MAX) ??
    cleaned[cleaned.length - 1]
  );
}

const CLAUSE_BREAKS = [' — ', ' – ', ': ', '; ', ', '];

/** Shorten at the latest clause break that keeps most of the headline, else at a word. */
function truncateTitle(value: string, max: number): string {
  const floor = Math.ceil(max * 0.6);
  let cut = -1;
  for (const separator of CLAUSE_BREAKS) {
    let at = value.indexOf(separator);
    while (at !== -1) {
      if (at >= floor && at <= max && at > cut) cut = at;
      at = value.indexOf(separator, at + 1);
    }
  }
  if (cut !== -1) return value.slice(0, cut).trim();
  return truncateAtWord(value, max);
}

function truncateAtWord(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const kept = lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut;
  return `${kept.replace(/[,;:\s]+$/, '')}…`;
}

/**
 * Build a description for a generated page (an area hub, a topic hub) that
 * lands inside the convention without inventing anything.
 *
 * Templated descriptions were `${entity.description} ${one fixed sentence}`,
 * which overflowed for the areas with a long blurb — five hub pages served
 * 194-199 characters, so Google cut the sentence mid-thought — and undershot
 * for topics with a short one. Given the lead text and several truthful tails
 * ordered however you like, this picks the LONGEST tail that still fits, and
 * falls back to a word-boundary truncation only when even the bare lead is too
 * long. It never pads: a short lead with no fitting tail stays short rather
 * than gaining filler that says nothing.
 */
export function composeDescription(lead: string, tails: string[], max: number = DESCRIPTION_MAX): string {
  const base = normalise(lead);
  const candidates = tails
    .map((tail) => normalise(`${base} ${tail}`))
    .filter((candidate) => candidate.length <= max)
    .sort((a, b) => b.length - a.length);
  if (candidates.length > 0) return candidates[0];
  return truncateAtWord(base, max);
}

export function pageMetadata({ path, title, description, noindex = false }: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title: titleMetadata(title),
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

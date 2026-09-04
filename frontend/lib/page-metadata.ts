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
//  - `title` is the bare page title. The root layout appends the brand, so
//    never write it twice.
//  - the canonical is always absolute and always self-referencing, built from
//    `absoluteUrl` so there is one definition of the site origin.
//  - per-visitor utility pages pass `noindex: true`. Those pages must also stay
//    out of `app/sitemap.ts`; `tests/page-metadata.test.mjs` fails the build if
//    a noindex path is listed there.

export type PageMetadataInput = {
  /** Site-root-relative path, e.g. `/sell/your-home`. */
  path: string;
  /** Page title WITHOUT the brand suffix — the root layout template adds it. */
  title: string;
  /** Meta description. CLAUDE.md's SEO convention is 140-165 characters. */
  description: string;
  /** Per-visitor utility pages: noindex, follow, and absent from the sitemap. */
  noindex?: boolean;
};

/** CLAUDE.md's meta-description convention. */
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 165;

/** The root layout appends this to every page title. */
export const TITLE_SUFFIX = ' | Columbus Real Estate News';
export const TITLE_MAX = 75;

/**
 * Longest candidate title whose RENDERED length (with the brand suffix the
 * layout adds) still fits. Generated hubs interpolate a place name, so a
 * template that is comfortable for "Bexley" runs past the limit for "The Ohio
 * State University area"; this picks a shorter phrasing for the long names
 * instead of letting the results page cut one.
 */
export function composeTitle(candidates: string[]): string {
  const fitting = candidates
    .map((candidate) => candidate.trim().replace(/\s+/g, ' '))
    .filter((candidate) => candidate.length + TITLE_SUFFIX.length <= TITLE_MAX)
    .sort((a, b) => b.length - a.length)[0];
  return fitting ?? candidates[candidates.length - 1].trim();
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
  const base = lead.trim().replace(/\s+/g, ' ');
  const candidates = tails
    .map((tail) => `${base} ${tail.trim()}`.replace(/\s+/g, ' ').trim())
    .filter((candidate) => candidate.length <= max)
    .sort((a, b) => b.length - a.length);
  if (candidates.length > 0) return candidates[0];
  return truncateAtWord(base, max);
}

export function pageMetadata({ path, title, description, noindex = false }: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

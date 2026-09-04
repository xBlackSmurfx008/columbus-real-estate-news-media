// Titles and meta descriptions.
//
// The gate already asserts that a page declares a canonical. It did not assert
// that the page says anything DIFFERENT from its neighbours, and on 2026-09-04
// seven indexable pages — /buy, /rent, /sell, /invest, /advertise, /subscribe
// and /contact — served the root layout's default title AND its default
// description, byte for byte. To a crawler those are seven copies of one page.
// Six more repeated the brand a second time on top of the layout's
// `%s | Columbus Real Estate News` template, producing 105-character titles
// that a results page truncates.
//
// Blocking half: a page in the sitemap with no title, no description, or a
// title/description it shares with another indexable page. Those are duplicate
// content signals, not style opinions.
//
// Advisory half: CLAUDE.md's length conventions (title 45-75, meta description
// 140-165) and a brand repeated inside one title. Real defects, but a long
// title costs a truncated snippet rather than an indexing decision.

import { decodeEntities, metaContent, title as documentTitle } from "../html.mjs";
import { htmlPages } from "../pages.mjs";
import { fail, pass, skip } from "../result.mjs";

export const TITLE_MIN = 45;
export const TITLE_MAX = 75;
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 165;
export const BRAND = "Columbus Real Estate News";

/** Group paths by the exact string they serve. Only collisions come back. */
export function duplicates(entries) {
  const byValue = new Map();
  for (const [path, value] of entries) {
    if (!value) continue;
    byValue.set(value, [...(byValue.get(value) ?? []), path]);
  }
  return [...byValue.entries()].filter((entry) => entry[1].length > 1);
}

/**
 * Article `<title>`s are the published headline plus the brand suffix. The
 * headline is an editorial decision governed by `publish-article.mjs`, and
 * `schema` already checks it against Google's 110-character truncation, so
 * measuring it against a template convention here would put a permanent,
 * unactionable note on every article page and train people to ignore the whole
 * check. Descriptions ARE checked everywhere: those are metadata, not copy.
 */
export function titleLengthApplies(path) {
  return !(path.startsWith("/blog/") && path !== "/blog/");
}

/** Length and brand-repetition notes for one page. Returns strings. */
export function lengthNotes(path, title, description) {
  const notes = [];
  if (title && titleLengthApplies(path) && (title.length < TITLE_MIN || title.length > TITLE_MAX)) {
    notes.push(`${path} title is ${title.length} chars (convention is ${TITLE_MIN}-${TITLE_MAX}): "${title}"`);
  }
  if (description && (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX)) {
    notes.push(`${path} meta description is ${description.length} chars (convention is ${DESCRIPTION_MIN}-${DESCRIPTION_MAX})`);
  }
  if (title && title.split(BRAND).length - 1 > 1) {
    notes.push(`${path} repeats "${BRAND}" twice in its title — the layout template already appends it`);
  }
  return notes;
}

export const metadataQuality = {
  id: "metadata",
  title: "Titles and meta descriptions",
  blocking: true,
  async run(context) {
    const usable = htmlPages(context.pages);
    if (usable.size === 0) return skip("metadata", "Titles and meta descriptions", true, "no page on the target returned renderable HTML");

    const findings = [];
    const advisory = [];
    const titles = [];
    const descriptions = [];

    for (const [path, response] of usable) {
      const title = decodeEntities(documentTitle(response.text) ?? "");
      const description = decodeEntities(metaContent(response.text, "description") ?? "");
      if (!title) findings.push(`${path} serves no <title>`);
      if (!description) findings.push(`${path} serves no meta description`);
      titles.push([path, title]);
      descriptions.push([path, description]);
      advisory.push(...lengthNotes(path, title, description));
    }

    for (const [value, paths] of duplicates(titles)) {
      findings.push(`${paths.length} pages share the title "${value}": ${paths.join(", ")}`);
    }
    for (const group of duplicates(descriptions)) {
      const paths = group[1];
      findings.push(`${paths.length} pages share one meta description: ${paths.join(", ")}`);
    }

    const stats = { pagesInspected: usable.size };
    if (findings.length > 0) {
      return fail("metadata", "Titles and meta descriptions", true, `${findings.length} duplicate or missing page metadata defect(s)`, [...findings, ...advisory], stats);
    }
    if (advisory.length > 0) {
      return fail("metadata", "Titles and meta descriptions", false, `${advisory.length} title/description length note(s) across ${usable.size} page(s)`, advisory, stats);
    }
    return pass("metadata", "Titles and meta descriptions", true, `all ${usable.size} page(s) serve a unique, in-convention title and meta description`, stats);
  },
};

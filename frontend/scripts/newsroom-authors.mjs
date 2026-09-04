// Single source of truth for newsroom bylines (owner plan 2026-09-04, P1 item 7:
// "One newsroom identity"). Everything that writes or checks an article byline
// imports from here so a new variant can never drift into production again.
//
// To add a real bylined human later: append the exact display name to
// APPROVED_AUTHORS. Nothing else needs to change.

export const CANONICAL_NEWSROOM_AUTHOR = "CREN Newsroom";

// Every byline allowed to publish. Exact, case-sensitive display names.
export const APPROVED_AUTHORS = [CANONICAL_NEWSROOM_AUTHOR];

// Historical variants of the newsroom byline that must be normalized to the
// canonical name. Used by scripts/normalize-article-authors.mjs and by the
// publish gate to give a precise error message.
export const NEWSROOM_AUTHOR_ALIASES = [
  "CRE Newsroom",
  "CRE News Newsroom",
  "CRE News Staff",
  "CREN Staff",
  "CRE News Desk",
];

export function isApprovedAuthor(author) {
  return typeof author === "string" && APPROVED_AUTHORS.includes(author.trim());
}

export function canonicalizeAuthor(author) {
  const trimmed = typeof author === "string" ? author.trim() : "";
  if (NEWSROOM_AUTHOR_ALIASES.includes(trimmed)) return CANONICAL_NEWSROOM_AUTHOR;
  return trimmed;
}

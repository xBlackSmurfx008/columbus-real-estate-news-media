// The FTC disclosure rule from .claude/skills/cren-sales, as a pure predicate.
//
// It lives here, apart from the renderer, so it can be asserted in tests
// without a DOM and so there is exactly one definition of "this block needs the
// disclosure". `components/outbound-link-group.tsx` is the only renderer, and
// it derives the disclosure from the array it is about to render by calling
// this — never from a prop a caller could forget or set wrong.

/** A block shows the FTC disclosure exactly when it contains a paid link. */
export function groupRequiresDisclosure(links: ReadonlyArray<{ sponsored: boolean }>): boolean {
  return links.some((link) => link.sponsored);
}

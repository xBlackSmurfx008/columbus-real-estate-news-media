// Missing disclosure text.
//
// Two disclosures the site is committed to (owner plan 2026-09-04, item 6 and
// the FTC endorsement rules):
//
//   components/funnel-disclosure.tsx — plain-English commercial disclosure that
//     must appear on all four lead funnels before a reader submits anything.
//   components/ftc-disclosure.tsx — paid-link disclosure that must appear
//     ABOVE any affiliate block, not merely somewhere on the page.
//
// The marker phrases below are copied from those components. To stop the check
// rotting into a no-op when the copy is reworded, `verifyMarkers()` first
// asserts each phrase is still in the component source; a marker that no longer
// exists is reported as a broken check, never as a pass.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { FUNNELS } from "../../funnel-lib.mjs";
import { textContent } from "../html.mjs";
import { htmlPages } from "../pages.mjs";
import { fail, skip, verdict } from "../result.mjs";
import { FRONTEND_ROOT } from "../spawn.mjs";
import { url as targetUrl } from "../target.mjs";

const FUNNEL_MARKERS = {
  component: join("components", "funnel-disclosure.tsx"),
  phrases: ["Straight talk before you send this", "Who reads this", "How we get paid"],
};
const FTC_MARKERS = {
  component: join("components", "ftc-disclosure.tsx"),
  // Apostrophe-insensitive: the component writes &apos; and textContent() decodes it.
  phrases: ["Some links below pay us if you buy"],
};

export function verifyMarkers(marker, root = FRONTEND_ROOT) {
  const path = join(root, marker.component);
  if (!existsSync(path)) return [`${marker.component} does not exist; the disclosure check has no component to verify against`];
  const source = readFileSync(path, "utf8");
  const normalized = source.replace(/&apos;|&#39;/g, "'").replace(/\s+/g, " ");
  return marker.phrases
    .filter((phrase) => !normalized.includes(phrase))
    .map((phrase) => `${marker.component} no longer contains the marker phrase "${phrase}" — update scripts/site-quality/checks/disclosures.mjs`);
}

export const funnelDisclosures = {
  id: "disclosure-funnel",
  title: "Commercial disclosure on the four funnels",
  blocking: true,
  async run(context) {
    const drift = verifyMarkers(FUNNEL_MARKERS);
    if (drift.length > 0) {
      return fail("disclosure-funnel", "Commercial disclosure on the four funnels", true, "the check's marker phrases no longer match the component", drift);
    }

    const findings = [];
    let inspected = 0;
    for (const funnel of FUNNELS) {
      const response = context.pages.get(funnel.path) ?? (await context.http.get(targetUrl(context.target, funnel.path)));
      if (!response.ok) {
        findings.push(`${funnel.path} (${funnel.label}) — did not render (${response.error ?? `HTTP ${response.status}`}), so the disclosure cannot be confirmed`);
        continue;
      }
      inspected += 1;
      const text = textContent(response.text);
      const missing = FUNNEL_MARKERS.phrases.filter((phrase) => !text.includes(phrase));
      if (missing.length > 0) {
        findings.push(`${funnel.path} (${funnel.label}) — commercial disclosure missing: ${missing.map((m) => `"${m}"`).join(", ")}`);
      }
    }

    return verdict(
      "disclosure-funnel",
      "Commercial disclosure on the four funnels",
      true,
      findings,
      `all ${inspected} funnel page(s) carry the plain-English commercial disclosure`,
      `${findings.length} funnel page(s) are missing the commercial disclosure`,
      { funnels: FUNNELS.length, inspected },
    );
  },
};

/** Index of the first tracked outbound hop (/go/*) in the raw HTML, or -1. */
export function firstAffiliateLinkIndex(html) {
  const match = html.match(/href=["']\/go\/[^"']+["']/);
  return match ? html.indexOf(match[0]) : -1;
}

/**
 * Index of the first PAID link in the raw HTML, or -1.
 *
 * `/go/*` is the outbound click tracker and says nothing about money: the same
 * redirector carries unpaid links to Zillow, Realtor.com and the county
 * auditor. `rel="sponsored"` is what marks a click someone actually pays for,
 * it is emitted by exactly one component (components/outbound-link-group.tsx,
 * which derives the disclosure from the same array), and a unit test fails the
 * build if it appears anywhere else.
 *
 * Keying the disclosure rule on `/go/*` made the gate demand a disclosure on
 * /housing-search today, when every affiliate_partners row is still an
 * example.com placeholder and nothing pays. Publishing "some links pay us"
 * there would be a false statement — the exact thing the disclosure exists to
 * prevent. The rule is: a disclosure must sit above every PAID link.
 */
export function firstSponsoredLinkIndex(html) {
  const match = html.match(/<a\b[^>]*\brel=["'][^"']*\bsponsored\b[^"']*["'][^>]*>/i);
  return match ? html.indexOf(match[0]) : -1;
}

/** Index of the first FTC disclosure phrase in the raw HTML, or -1. */
export function ftcDisclosureIndex(html) {
  const normalized = html.replace(/&apos;|&#39;|&#x27;/g, "'");
  for (const phrase of FTC_MARKERS.phrases) {
    const index = normalized.indexOf(phrase);
    if (index !== -1) return index;
  }
  return -1;
}

export const affiliateDisclosure = {
  id: "disclosure-affiliate",
  title: "FTC disclosure above affiliate blocks",
  blocking: true,
  async run(context) {
    const drift = verifyMarkers(FTC_MARKERS);
    if (drift.length > 0) {
      return fail("disclosure-affiliate", "FTC disclosure above affiliate blocks", true, "the check's marker phrases no longer match the component", drift);
    }

    const usable = htmlPages(context.pages);
    const withTrackedLinks = [...usable.entries()].filter(([, response]) => firstAffiliateLinkIndex(response.text) !== -1);
    const withPaidLinks = [...usable.entries()].filter(([, response]) => firstSponsoredLinkIndex(response.text) !== -1);

    if (withPaidLinks.length === 0) {
      // Critical distinction: "nothing to check" is NOT "the disclosure is
      // fine". Say so, loudly, with the reason — and say which of the two
      // reasons it is, because they call for completely different actions.
      const reason = withTrackedLinks.length > 0
        ? `${withTrackedLinks.length} sampled page(s) on ${context.target.origin} render tracked outbound links (/go/*), but not one is marked rel="sponsored", so no paid link exists to disclose above — every affiliate_partners row is still an example.com placeholder. This rule starts asserting the moment a real program is joined.`
        : `no sampled page on ${context.target.origin} renders any outbound link, so the disclosure rule has nothing to assert against`;
      return skip("disclosure-affiliate", "FTC disclosure above affiliate blocks", true, reason, {
        pagesInspected: usable.size,
        pagesWithTrackedLinks: withTrackedLinks.length,
      });
    }

    const findings = [];
    for (const [path, response] of withPaidLinks) {
      const paidAt = firstSponsoredLinkIndex(response.text);
      const disclosureAt = ftcDisclosureIndex(response.text);
      if (disclosureAt === -1) findings.push(`${path} renders paid links (rel="sponsored") with no FTC disclosure anywhere on the page`);
      else if (disclosureAt > paidAt) findings.push(`${path} renders the FTC disclosure BELOW the first paid link`);
    }

    return verdict(
      "disclosure-affiliate",
      "FTC disclosure above affiliate blocks",
      true,
      findings,
      `${withPaidLinks.length} page(s) with paid links all disclose above the block`,
      `${findings.length} page(s) place paid links without a disclosure above them`,
      { pagesWithPaidLinks: withPaidLinks.length, pagesWithTrackedLinks: withTrackedLinks.length },
    );
  },
};

export const disclosurePolicyPages = {
  id: "disclosure-policy-pages",
  title: "Disclosure policy pages are reachable",
  blocking: true,
  async run(context) {
    const required = ["/lead-disclosure", "/editorial-standards", "/privacy", "/terms"];
    const findings = [];
    for (const path of required) {
      const response = context.pages.get(path) ?? (await context.http.get(targetUrl(context.target, path)));
      if (!response.ok) findings.push(`${path} — ${response.error ?? `HTTP ${response.status}`} (the funnel disclosure links here)`);
    }
    return verdict(
      "disclosure-policy-pages",
      "Disclosure policy pages are reachable",
      true,
      findings,
      `all ${required.length} disclosure policy page(s) resolve`,
      `${findings.length} disclosure policy page(s) do not resolve`,
    );
  },
};

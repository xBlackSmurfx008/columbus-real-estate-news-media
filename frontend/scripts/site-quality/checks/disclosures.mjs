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

/** Index of the first affiliate hop link in the raw HTML, or -1. */
export function firstAffiliateLinkIndex(html) {
  const match = html.match(/href=["']\/go\/[^"']+["']/);
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
    const withAffiliates = [...usable.entries()].filter(([, response]) => firstAffiliateLinkIndex(response.text) !== -1);

    if (withAffiliates.length === 0) {
      // Critical distinction: "nothing to check" is NOT "the disclosure is
      // fine". Say so, loudly, with the reason.
      return skip(
        "disclosure-affiliate",
        "FTC disclosure above affiliate blocks",
        true,
        `no sampled page on ${context.target.origin} renders an affiliate link (/go/*), so the disclosure rule has nothing to assert against — verify affiliate_partners rows are real, not example.com placeholders`,
        { pagesInspected: usable.size },
      );
    }

    const findings = [];
    for (const [path, response] of withAffiliates) {
      const affiliateAt = firstAffiliateLinkIndex(response.text);
      const disclosureAt = ftcDisclosureIndex(response.text);
      if (disclosureAt === -1) findings.push(`${path} renders affiliate links with no FTC disclosure anywhere on the page`);
      else if (disclosureAt > affiliateAt) findings.push(`${path} renders the FTC disclosure BELOW the first affiliate link`);
    }

    return verdict(
      "disclosure-affiliate",
      "FTC disclosure above affiliate blocks",
      true,
      findings,
      `${withAffiliates.length} page(s) with affiliate links all disclose above the block`,
      `${findings.length} page(s) place affiliate links without a disclosure above them`,
      { pagesWithAffiliates: withAffiliates.length },
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

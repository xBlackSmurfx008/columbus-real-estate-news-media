// Broken links.
//
// Two halves:
//   internal (BLOCKING) - every same-origin href on a sampled page resolves to
//     a 2xx/3xx. A 404 inside our own navigation is a defect we ship, not a
//     third party's problem.
//   external (ADVISORY, opt-in) - the outbound source links in article bodies.
//     Off by default: CLAUDE.md forbids hammering other people's sites, and a
//     source outlet's 403 to an automated client is not a defect in our page.

import { internalPaths, externalUrls } from "../html.mjs";
import { mapLimit } from "../http.mjs";
import { htmlPages } from "../pages.mjs";
import { fail, pass, skip, verdict } from "../result.mjs";
import { url as targetUrl } from "../target.mjs";

const ID = "links";
const TITLE = "Broken links";

export const internalLinks = {
  id: ID,
  title: TITLE,
  blocking: true,
  async run(context) {
    const { http, target, pages } = context;
    const usable = htmlPages(pages);
    if (usable.size === 0) {
      return skip(ID, TITLE, true, "no page on the target returned renderable HTML");
    }

    // path -> the pages that link to it, so a finding names the culprit.
    const referrers = new Map();
    for (const [path, response] of usable) {
      for (const link of internalPaths(response.text, target.origin)) {
        if (!referrers.has(link)) referrers.set(link, new Set());
        referrers.get(link).add(path);
      }
    }

    const targets = [...referrers.keys()];
    const results = await mapLimit(targets, 8, async (path) => {
      const cached = pages.get(path);
      const response = cached ?? (await http.get(targetUrl(target, path)));
      return { path, status: response.status, error: response.error };
    });

    const findings = [];
    for (const entry of results) {
      const from = [...referrers.get(entry.path)].sort().slice(0, 3).join(", ");
      if (entry.status === null) {
        findings.push(`${entry.path} — request failed (${entry.error}); linked from ${from}`);
      } else if (entry.status >= 400) {
        findings.push(`${entry.path} — HTTP ${entry.status}; linked from ${from}`);
      }
    }

    return verdict(
      ID,
      TITLE,
      true,
      findings,
      `${targets.length} internal link target(s) across ${usable.size} page(s) all resolve`,
      `${findings.length} of ${targets.length} internal link target(s) are broken`,
      { pagesInspected: usable.size, linkTargets: targets.length },
    );
  },
};

export const externalLinks = {
  id: "links-external",
  title: "Outbound source links",
  blocking: false,
  async run(context) {
    const { http, target, pages, options } = context;
    if (!options.externalLinks) {
      return skip(
        "links-external",
        "Outbound source links",
        false,
        "off by default (fetching other outlets on every run violates the sourcing etiquette in CLAUDE.md); pass --external-links to run it",
      );
    }

    const usable = htmlPages(pages);
    const articlePaths = [...usable.keys()].filter((path) => path.startsWith("/blog/"));
    if (articlePaths.length === 0) {
      return skip("links-external", "Outbound source links", false, "no article page in the sample rendered");
    }

    const urls = new Set();
    for (const path of articlePaths) {
      for (const entry of externalUrls(usable.get(path).text, target.origin)) urls.add(entry);
    }

    const checked = await mapLimit([...urls], 3, async (entry) => {
      const response = await http.head(entry);
      // Some outlets refuse HEAD; a 405 is not a dead link.
      if (response.status === 405 || response.status === 403) {
        return { url: entry, status: response.status, note: "server refused an automated HEAD" };
      }
      return { url: entry, status: response.status, error: response.error };
    });

    const findings = checked
      .filter((entry) => entry.status === null || entry.status >= 400)
      .filter((entry) => !entry.note)
      .map((entry) => `${entry.url} — ${entry.status === null ? entry.error : `HTTP ${entry.status}`}`);

    if (findings.length === 0) {
      return pass("links-external", "Outbound source links", false, `${urls.size} outbound source link(s) reachable`, {
        checked: urls.size,
      });
    }
    return fail(
      "links-external",
      "Outbound source links",
      false,
      `${findings.length} of ${urls.size} outbound source link(s) did not resolve`,
      findings,
      { checked: urls.size },
    );
  },
};

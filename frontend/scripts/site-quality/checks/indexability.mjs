// Indexability.
//
// The question: does what we tell search engines match what we actually serve?
// The three artefacts have to agree — robots.txt, the sitemap, and the page's
// own meta robots. A page listed in the sitemap that carries `noindex`, or a
// sitemap URL blocked by robots.txt, is a contradiction we are shipping.

import { canonicalHrefs, hasNoindex, metaContent } from "../html.mjs";
import { htmlPages } from "../pages.mjs";
import { fail, pass, skip, verdict } from "../result.mjs";
import { url as targetUrl } from "../target.mjs";

/** Minimal robots.txt parser: group directives by user-agent. */
export function parseRobots(text) {
  const groups = [];
  let current = null;
  const sitemaps = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "sitemap") {
      sitemaps.push(value);
    } else if ((key === "allow" || key === "disallow") && current) {
      current.rules.push({ type: key, path: value });
    }
  }
  return { groups, sitemaps };
}

/** Google's longest-match rule, restricted to the `*` group. */
export function isAllowed(robots, path) {
  const group = robots.groups.find((entry) => entry.agents.includes("*"));
  if (!group) return true;
  let best = null;
  for (const rule of group.rules) {
    if (!rule.path) continue;
    const pattern = rule.path.replace(/\*+$/, "");
    if (!path.startsWith(pattern)) continue;
    if (!best || pattern.length > best.pattern.length) best = { pattern, type: rule.type };
  }
  if (!best) return true;
  return best.type === "allow";
}

export const indexability = {
  id: "indexability",
  title: "Indexability",
  blocking: true,
  async run(context) {
    const { http, target, corpus } = context;
    const findings = [];
    const advisory = [];

    // robots.txt
    const robotsResponse = await http.get(targetUrl(target, "/robots.txt"));
    let robots = null;
    if (!robotsResponse.ok) {
      findings.push(`/robots.txt — ${robotsResponse.error ?? `HTTP ${robotsResponse.status}`}`);
    } else {
      robots = parseRobots(robotsResponse.text);
      if (robots.sitemaps.length === 0) findings.push("/robots.txt declares no Sitemap");
      for (const path of ["/admin/", "/api/"]) {
        if (isAllowed(robots, path)) findings.push(`/robots.txt allows crawling of ${path}`);
      }
      if (!isAllowed(robots, "/blog/")) findings.push("/robots.txt blocks /blog/ — the entire article archive would be de-indexed");
      for (const sitemapUrl of robots.sitemaps) {
        const response = await http.get(sitemapUrl);
        if (!response.ok) findings.push(`sitemap declared in robots.txt is unreachable: ${sitemapUrl} (${response.error ?? `HTTP ${response.status}`})`);
      }
    }

    // sitemap.xml
    if (!corpus.ok) {
      findings.push(`sitemap: ${corpus.reason}`);
    } else {
      if (corpus.sitemapUrls.length === 0) findings.push("/sitemap.xml parses but lists zero URLs");
      const offOrigin = corpus.sitemapUrls.filter((entry) => !entry.startsWith(`${target.origin}/`) && entry !== target.origin);
      if (offOrigin.length > 0) {
        findings.push(`sitemap lists ${offOrigin.length} URL(s) outside ${target.origin}, e.g. ${offOrigin[0]}`);
      }
      const seen = new Set();
      const duplicates = corpus.sitemapUrls.filter((entry) => (seen.has(entry) ? true : (seen.add(entry), false)));
      if (duplicates.length > 0) advisory.push(`sitemap lists ${duplicates.length} duplicate URL(s), e.g. ${duplicates[0]}`);
      if (robots) {
        for (const entry of corpus.sitemapUrls.slice(0, 500)) {
          let path;
          try {
            path = new URL(entry).pathname;
          } catch {
            findings.push(`sitemap contains an unparseable URL: ${entry}`);
            continue;
          }
          if (!isAllowed(robots, path)) findings.push(`sitemap lists ${path} but robots.txt disallows it`);
        }
      }
    }

    // Served pages: nothing in the sitemap may say noindex.
    const usable = htmlPages(context.pages);
    const sitemapPaths = new Set(
      corpus.ok
        ? corpus.sitemapUrls.map((entry) => {
            try {
              return new URL(entry).pathname;
            } catch {
              return null;
            }
          })
        : [],
    );
    for (const [path, response] of usable) {
      const xRobots = response.headers.get("x-robots-tag") ?? "";
      const metaRobots = metaContent(response.text, "robots");
      const blocked = hasNoindex(response.text) || /\bnoindex\b/i.test(xRobots);
      if (blocked && sitemapPaths.has(path)) {
        findings.push(`${path} is listed in the sitemap but serves noindex (meta="${metaRobots ?? ""}" x-robots-tag="${xRobots}")`);
      } else if (blocked) {
        advisory.push(`${path} serves noindex (meta="${metaRobots ?? ""}" x-robots-tag="${xRobots}")`);
      }
    }

    if (usable.size === 0 && findings.length === 0) {
      return skip("indexability", "Indexability", true, "no page on the target rendered, so served-page indexability could not be judged");
    }

    const stats = { sitemapUrls: corpus.ok ? corpus.sitemapUrls.length : 0, pagesInspected: usable.size };
    if (findings.length > 0) {
      return fail("indexability", "Indexability", true, `${findings.length} indexability contradiction(s)`, [...findings, ...advisory], stats);
    }
    if (advisory.length > 0) {
      return fail("indexability", "Indexability", false, `${advisory.length} indexability note(s)`, advisory, stats);
    }
    return pass("indexability", "Indexability", true, `robots.txt, ${stats.sitemapUrls} sitemap URL(s) and ${usable.size} served page(s) agree`, stats);
  },
};

export const canonicals = {
  id: "canonicals",
  title: "Canonical URLs",
  blocking: true,
  async run(context) {
    const { target } = context;
    const usable = htmlPages(context.pages);
    if (usable.size === 0) return skip("canonicals", "Canonical URLs", true, "no page on the target returned renderable HTML");

    const findings = [];
    const advisory = [];

    for (const [path, response] of usable) {
      const hrefs = canonicalHrefs(response.text);
      if (hrefs.length === 0) {
        // Not every page needs one, but a page in the sitemap does: without it
        // a query-string or trailing-slash variant becomes a duplicate.
        advisory.push(`${path} has no <link rel="canonical">`);
        continue;
      }
      if (hrefs.length > 1) {
        findings.push(`${path} declares ${hrefs.length} canonical URLs (${hrefs.join(", ")}) — search engines discard all of them`);
        continue;
      }
      const href = hrefs[0];
      let parsed;
      try {
        parsed = new URL(href, target.origin);
      } catch {
        findings.push(`${path} canonical "${href}" is not a valid URL`);
        continue;
      }
      if (!href.startsWith("http")) findings.push(`${path} canonical "${href}" is relative; canonical URLs must be absolute`);
      if (target.isProduction && parsed.protocol !== "https:") findings.push(`${path} canonical "${href}" is not https`);
      if (target.isProduction && parsed.hostname !== target.hostname) {
        findings.push(`${path} canonical points at a different host (${parsed.hostname}, expected ${target.hostname})`);
      }
      if (parsed.search) advisory.push(`${path} canonical carries a query string (${parsed.search})`);

      const canonicalPath = parsed.pathname.replace(/\/$/, "") || "/";
      const servedPath = path.split("?")[0].replace(/\/$/, "") || "/";
      if (canonicalPath !== servedPath) {
        // A cross-pointing canonical is legitimate only if the target really
        // exists; otherwise we have told Google to index a 404.
        const targetResponse = context.pages.get(canonicalPath) ?? (await context.http.get(targetUrl(target, canonicalPath)));
        if (!targetResponse.ok) {
          findings.push(`${path} canonicalises to ${canonicalPath}, which returns ${targetResponse.error ?? `HTTP ${targetResponse.status}`}`);
        } else {
          advisory.push(`${path} canonicalises to a different path (${canonicalPath})`);
        }
      }
    }

    const stats = { pagesInspected: usable.size };
    if (findings.length > 0) {
      return fail("canonicals", "Canonical URLs", true, `${findings.length} canonical defect(s)`, [...findings, ...advisory], stats);
    }
    if (advisory.length > 0) {
      return fail("canonicals", "Canonical URLs", false, `${advisory.length} canonical note(s) across ${usable.size} page(s)`, advisory, stats);
    }
    return verdict("canonicals", "Canonical URLs", true, [], `all ${usable.size} page(s) declare exactly one absolute, self-referencing canonical`, "", stats);
  },
};

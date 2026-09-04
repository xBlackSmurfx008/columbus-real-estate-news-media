// Build-failing guards for the head of every hand-authored page.
//
// The 2026-09-04 site-quality run found three classes of defect that a build
// happily shipped: thirteen indexable pages with no canonical, seven pages
// sharing the root layout's default title AND description verbatim, and /saved
// listed in the sitemap while serving `noindex`. All three are cheap to
// re-introduce by hand and invisible until a crawler tells you months later, so
// they are asserted here rather than left to a human reading a diff.
//
// Everything below reads the SOURCE, not a running server, so it costs nothing
// and cannot be skipped because a target was unreachable.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { organizationNode, websiteNode, publisherGraph } from "../lib/publisher-schema.ts";

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = path.join(FRONTEND, "app");

// The root layout's title template. A page title that already ends in the brand
// renders it twice, e.g. "Join Free | CREN | CREN".
const BRAND = "Columbus Real Estate News";
const BRAND_SUFFIX = ` | ${BRAND}`;

const TITLE_MIN = 45;
const TITLE_MAX = 75;
const DESCRIPTION_MIN = 140;
const DESCRIPTION_MAX = 165;

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "api" || entry === "node_modules") continue;
      found.push(...walk(full));
    } else if (entry === "page.tsx") {
      found.push(full);
    }
  }
  return found;
}

/** app/sell/your-home/page.tsx -> /sell/your-home; route groups are stripped. */
function routeFor(file) {
  const rel = path.relative(APP_DIR, path.dirname(file));
  const segments = rel.split(path.sep).filter((s) => s && !(s.startsWith("(") && s.endsWith(")")));
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

function stringField(block, field) {
  const match = block.match(new RegExp(`${field}:\\s*(?:\\n\\s*)?(['"])((?:\\\\.|(?!\\1).)*)\\1`));
  if (!match) return null;
  return match[2].replace(/\\(['"\\])/g, "$1");
}

/** Every static page's declared metadata, parsed out of the source. */
function collectPages() {
  const pages = [];
  for (const file of walk(APP_DIR)) {
    const route = routeFor(file);
    if (route.includes("[") || route.startsWith("/admin")) continue;
    const source = readFileSync(file, "utf8");
    const start = source.indexOf("pageMetadata({");
    const legacy = source.indexOf("export const metadata");
    if (start === -1 && legacy === -1) continue;
    const block = start === -1 ? source.slice(legacy, source.indexOf("};", legacy)) : source.slice(start, source.indexOf("});", start));
    pages.push({
      file: path.relative(FRONTEND, file),
      route,
      usesHelper: start !== -1,
      declaredPath: stringField(block, "path"),
      title: stringField(block, "title"),
      description: stringField(block, "description"),
      noindex: /noindex:\s*true/.test(block) || /robots:\s*\{\s*index:\s*false/.test(block),
    });
  }
  return pages;
}

const pages = collectPages();
const sitemapSource = readFileSync(path.join(APP_DIR, "sitemap.ts"), "utf8");
// Literal entries in STATIC_SITEMAP_PATHS. The policy library is appended
// programmatically from POLICY_LIBRARY_ORDER and is not parsed here; none of
// those pages is noindex, which is what this file asserts about the sitemap.
const sitemapPaths = [...sitemapSource.matchAll(/^\s*'(\/[^']*)',$/gm)].map((m) => m[1]);

test("the metadata scan actually found the site's static pages", () => {
  assert.ok(pages.length >= 40, `expected the app router to hold 40+ static pages, parsed ${pages.length}`);
  assert.ok(sitemapPaths.length >= 30, `expected 30+ literal sitemap paths, parsed ${sitemapPaths.length}`);
  assert.ok(sitemapPaths.includes("/"), "the homepage is missing from the sitemap");
  assert.ok(pages.some((page) => page.route === "/"), "the homepage was not parsed");
});

test("every static page declares a self-referencing canonical through the shared helper", () => {
  const offenders = pages.filter((page) => !page.usesHelper);
  assert.deepEqual(
    offenders.map((page) => page.file),
    [],
    "these pages build metadata by hand instead of lib/page-metadata.ts, so nothing guarantees they carry a canonical",
  );
  for (const page of pages) {
    assert.equal(page.declaredPath, page.route, `${page.file} canonicalises to ${page.declaredPath}, but it is served at ${page.route}`);
  }
});

test("no page marked noindex is listed in the sitemap", () => {
  const contradictions = pages.filter((page) => page.noindex && sitemapPaths.includes(page.route));
  assert.deepEqual(
    contradictions.map((page) => page.route),
    [],
    "a sitemap entry asks Google to crawl a URL that tells Google not to keep it",
  );
});

test("per-visitor utility pages are noindex", () => {
  for (const route of ["/saved", "/profile", "/search"]) {
    const page = pages.find((entry) => entry.route === route);
    assert.ok(page, `${route} has no page.tsx`);
    assert.equal(page.noindex, true, `${route} renders one visitor's own state and must not be indexable`);
  }
});

test("titles and descriptions are unique across the site", () => {
  const seenTitles = new Map();
  const seenDescriptions = new Map();
  for (const page of pages) {
    assert.ok(page.title, `${page.file} declares no title`);
    assert.ok(page.description, `${page.file} declares no description`);
    const titleClash = seenTitles.get(page.title);
    assert.equal(titleClash, undefined, `${page.route} and ${titleClash} share the title "${page.title}"`);
    seenTitles.set(page.title, page.route);
    const descriptionClash = seenDescriptions.get(page.description);
    assert.equal(descriptionClash, undefined, `${page.route} and ${descriptionClash} share a meta description`);
    seenDescriptions.set(page.description, page.route);
  }
});

test("titles and descriptions sit inside the CLAUDE.md SEO bands", () => {
  const problems = [];
  for (const page of pages) {
    const rendered = `${page.title}${BRAND_SUFFIX}`;
    if (rendered.length < TITLE_MIN || rendered.length > TITLE_MAX) {
      problems.push(`${page.route} rendered title is ${rendered.length} chars (want ${TITLE_MIN}-${TITLE_MAX}): ${rendered}`);
    }
    if (page.description.length < DESCRIPTION_MIN || page.description.length > DESCRIPTION_MAX) {
      problems.push(`${page.route} description is ${page.description.length} chars (want ${DESCRIPTION_MIN}-${DESCRIPTION_MAX})`);
    }
  }
  assert.deepEqual(problems, []);
});

test("no page repeats the brand the layout template already appends", () => {
  const doubled = pages
    .map((page) => ({ route: page.route, rendered: `${page.title}${BRAND_SUFFIX}` }))
    .filter((page) => page.rendered.split(BRAND).length - 1 > 1);
  assert.deepEqual(doubled.map((page) => `${page.route}: ${page.rendered}`), []);
});

test("the homepage publisher graph asserts only facts the site publishes", () => {
  const graph = publisherGraph();
  assert.equal(graph["@context"], "https://schema.org");
  assert.equal(graph["@graph"].length, 2);

  const organization = organizationNode();
  assert.ok(organization["@type"].includes("Organization"));
  assert.equal(organization.name, BRAND);
  assert.equal(organization.url, "https://columbusrealestatenews.com/");
  assert.equal(organization.logo.url, "https://columbusrealestatenews.com/icon.svg");
  assert.equal(organization.publishingPrinciples, "https://columbusrealestatenews.com/editorial-standards");
  assert.equal(organization.correctionsPolicy, "https://columbusrealestatenews.com/corrections");

  // The point of the check: nothing here may be invented. No founding date, no
  // postal address, no phone number, no social profiles, no named people, no
  // ratings, no circulation. If the owner supplies them, add them AND relax
  // this list deliberately — never by accident.
  for (const forbidden of [
    "foundingDate",
    "address",
    "telephone",
    "email",
    "sameAs",
    "founder",
    "employee",
    "numberOfEmployees",
    "aggregateRating",
    "award",
    "member",
  ]) {
    assert.equal(organization[forbidden], undefined, `Organization asserts "${forbidden}", which is not established anywhere on the site`);
  }
});

test("the WebSite node points its SearchAction at the real search route", () => {
  const website = websiteNode();
  assert.equal(website["@type"], "WebSite");
  assert.equal(website.publisher["@id"], organizationNode()["@id"]);
  assert.equal(
    website.potentialAction.target.urlTemplate,
    "https://columbusrealestatenews.com/search?q={search_term_string}",
  );
  assert.equal(website.potentialAction["query-input"], "required name=search_term_string");

  // app/search/page.tsx really does read `q` — a SearchAction pointed at a
  // parameter the app ignores is a promise to Google we do not keep.
  const searchSource = readFileSync(path.join(APP_DIR, "search", "page.tsx"), "utf8");
  assert.match(searchSource, /params\.q\b/);
});

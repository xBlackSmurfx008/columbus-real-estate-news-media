// Unit tests for the pure helpers behind `npm run verify:site`.
//
// A checker that is wrong is worse than no checker: it either cries wolf until
// people mute it, or it passes something broken. Everything here is a case that
// actually bit during development, or a rule the suite's verdicts depend on.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  anchors,
  canonicalHrefs,
  decodeEntities,
  externalUrls,
  hasNoindex,
  internalPaths,
  jsonLdNodes,
  metaContent,
  tags,
  textContent,
} from "../scripts/site-quality/html.mjs";
import { acceptedOrigins, classifyPath, parseSitemapUrls, pathFromUrl, sample } from "../scripts/site-quality/corpus.mjs";
import { resolveTarget, url as targetUrl } from "../scripts/site-quality/target.mjs";
import { FAIL, PASS, SKIP, isBlockingFailure, result, verdict } from "../scripts/site-quality/result.mjs";
import { isAllowed, parseRobots } from "../scripts/site-quality/checks/indexability.mjs";
import { findNode, validateBreadcrumb, validateNewsArticle } from "../scripts/site-quality/checks/schema.mjs";
import { bodyUrls, citedDomains } from "../scripts/site-quality/checks/sources.mjs";
import { cadenceFor, daysBetween, parseSourceDate } from "../scripts/site-quality/checks/stale-stats.mjs";
import { duplicateGroups, normalizeByline } from "../scripts/site-quality/checks/authors.mjs";
import { firstAffiliateLinkIndex, firstSponsoredLinkIndex, ftcDisclosureIndex, verifyMarkers } from "../scripts/site-quality/checks/disclosures.mjs";
import { assertAllPayloadsAreTestTraffic } from "../scripts/site-quality/checks/lead-form.mjs";
import { buildSmokeRequests } from "../scripts/submission-smoke.mjs";
import { percentile } from "../scripts/site-quality/checks/performance.mjs";
import { parseAuditJson } from "../scripts/site-quality/checks/readiness.mjs";
import { parseAuditReport } from "../scripts/site-quality/checks/images.mjs";
import { duplicates, lengthNotes } from "../scripts/site-quality/checks/metadata.mjs";
import { CHECK_IDS } from "../scripts/site-quality/runner.mjs";

// --- result model -----------------------------------------------------------

test("a SKIP without a reason is rejected outright", () => {
  assert.throws(() => result({ id: "x", title: "X", blocking: true, status: SKIP, summary: "" }), /must carry a reason/);
});

test("a skipped check never counts as a blocking failure, and never as a pass", () => {
  const skipped = result({ id: "x", title: "X", blocking: true, status: SKIP, summary: "", reason: "no credentials" });
  assert.equal(isBlockingFailure(skipped), false);
  assert.notEqual(skipped.status, PASS);
});

test("advisory failures do not block; blocking failures do", () => {
  assert.equal(isBlockingFailure(verdict("a", "A", false, ["bad"], "ok", "bad")), false);
  assert.equal(isBlockingFailure(verdict("a", "A", true, ["bad"], "ok", "bad")), true);
  assert.equal(verdict("a", "A", true, [], "ok").status, PASS);
  assert.equal(verdict("a", "A", true, ["bad"], "ok").status, FAIL);
});

test("an ERROR result always blocks, whatever the check declared", () => {
  assert.equal(isBlockingFailure({ status: "ERROR", blocking: false }), true);
});

// --- targets ----------------------------------------------------------------

test("target aliases resolve and production refuses writes by default", () => {
  const production = resolveTarget("production");
  assert.equal(production.origin, "https://columbusrealestatenews.com");
  assert.equal(production.isProduction, true);
  assert.equal(production.writesAllowed, false);

  const local = resolveTarget("local");
  assert.equal(local.origin, "http://localhost:3000");
  assert.equal(local.isLocal, true);
  assert.equal(local.writesAllowed, true, "a non-production target may be written to");

  assert.equal(resolveTarget("production", { allowWrite: true }).writesAllowed, true);
  assert.equal(targetUrl(local, "/blog"), "http://localhost:3000/blog");
});

test("a target with embedded credentials is refused", () => {
  assert.throws(() => resolveTarget("https://user:pass@example.com"), /credentials/);
  assert.throws(() => resolveTarget("not a url"), /absolute URL/);
});

// --- HTML helpers -----------------------------------------------------------

test("attribute values are entity-decoded", () => {
  // The bug this test exists for: without decoding, every Next.js image URL
  // reads as `…?url=x&amp;w=3840`, fetches a 400, and the suite reports the
  // entire site's imagery as broken.
  const html = '<img src="/_next/image?url=%2Fa.webp&amp;w=3840&amp;q=75">';
  assert.equal(tags(html)[0].attributes.src, "/_next/image?url=%2Fa.webp&w=3840&q=75");
  assert.equal(decodeEntities("a &amp; b &#39;c&#39;"), "a & b 'c'");
});

test("internal link extraction skips anchors, schemes, and the affiliate hop", () => {
  const html = [
    '<a href="/blog/post">post</a>',
    '<a href="#top">top</a>',
    '<a href="mailto:a@b.com">mail</a>',
    '<a href="/go/partner?from=/x">partner</a>',
    '<a href="https://columbusrealestatenews.com/about">about</a>',
    '<a href="https://example.com/story">source</a>',
  ].join("");
  assert.deepEqual(internalPaths(html, "https://columbusrealestatenews.com").sort(), ["/about", "/blog/post"]);
  assert.deepEqual(externalUrls(html, "https://columbusrealestatenews.com"), ["https://example.com/story"]);
  assert.equal(anchors(html).length, 6);
});

test("canonical, robots meta and title are read from head markup", () => {
  const html = '<title>Hello</title><link rel="canonical" href="https://x.test/a"><meta name="robots" content="noindex, follow">';
  assert.deepEqual(canonicalHrefs(html), ["https://x.test/a"]);
  assert.equal(metaContent(html, "robots"), "noindex, follow");
  assert.equal(hasNoindex(html), true);
  assert.equal(hasNoindex('<meta name="robots" content="index, follow">'), false);
});

test("ld+json inside @graph is flattened, and script/style text is stripped", () => {
  const html = '<script type="application/ld+json">{"@graph":[{"@type":"NewsArticle","headline":"H"}]}</script><style>p{}</style><p>Body &amp; more</p>';
  const nodes = jsonLdNodes(html);
  assert.equal(findNode(nodes, "NewsArticle").headline, "H");
  assert.equal(textContent(html), "Body & more");
});

// --- corpus -----------------------------------------------------------------

test("sitemap parsing, path classification and deterministic sampling", () => {
  const xml = "<urlset><url><loc>https://x.test/</loc></url><url><loc>https://x.test/blog/a</loc></url></urlset>";
  assert.deepEqual(parseSitemapUrls(xml), ["https://x.test/", "https://x.test/blog/a"]);
  assert.equal(pathFromUrl("https://x.test/blog/a", "https://x.test"), "/blog/a");
  assert.equal(pathFromUrl("https://other.test/x", "https://x.test"), null);
  assert.equal(pathFromUrl("https://other.test/x", "https://x.test", ["https://other.test"]), "/x");
  assert.equal(classifyPath("/blog/a"), "article");
  assert.equal(classifyPath("/areas/dublin"), "area");
  assert.equal(classifyPath("/about"), "static");

  const items = ["a", "b", "c", "d", "e", "f", "g", "h"];
  assert.deepEqual(sample(items, 4), sample(items, 4), "sampling is stable across runs");
  assert.equal(sample(items, 4).length, 4);
  assert.deepEqual(sample(items, 20), items, "asking for more than exists returns everything");
});

// --- robots.txt -------------------------------------------------------------

test("robots.txt directives are applied with longest-match precedence", () => {
  const robots = parseRobots(["User-agent: *", "Allow: /", "Disallow: /admin/", "Disallow: /api/", "Sitemap: https://x.test/sitemap.xml"].join("\n"));
  assert.deepEqual(robots.sitemaps, ["https://x.test/sitemap.xml"]);
  assert.equal(isAllowed(robots, "/blog/a"), true);
  assert.equal(isAllowed(robots, "/admin/queue"), false);
  assert.equal(isAllowed(robots, "/api/leads"), false);
});

// --- schema -----------------------------------------------------------------

test("NewsArticle validation catches the fields Google requires", () => {
  const complete = {
    "@type": "NewsArticle",
    headline: "A Columbus story",
    datePublished: "2026-09-01T00:00:00.000Z",
    author: { "@type": "Organization", name: "CREN Newsroom" },
    publisher: { "@type": "Organization", name: "CREN" },
    mainEntityOfPage: "https://x.test/blog/a",
    image: ["https://cdn.test/a.webp"],
  };
  assert.deepEqual(validateNewsArticle(complete), []);
  assert.match(validateNewsArticle({ ...complete, datePublished: undefined })[0], /datePublished/);
  assert.match(validateNewsArticle({ ...complete, image: ["/local.webp"] })[0], /absolute URL/);
  assert.match(validateNewsArticle({ ...complete, headline: "x".repeat(120) })[0], /110/);
});

test("BreadcrumbList positions must be 1..n and every item but the last needs a URL", () => {
  const good = { itemListElement: [{ name: "Home", position: 1, item: "https://x.test/" }, { name: "Post", position: 2 }] };
  assert.deepEqual(validateBreadcrumb(good), []);
  const bad = { itemListElement: [{ name: "Home", position: 5, item: "https://x.test/" }] };
  assert.match(validateBreadcrumb(bad)[0], /position/);
});

// --- sources ----------------------------------------------------------------

test("source citations are counted by distinct off-site domain", () => {
  const body = [
    "The city said so in [its notice](https://columbus.gov/notice).",
    "See also https://www.dispatch.com/story and [our earlier piece](https://columbusrealestatenews.com/blog/x).",
  ].join("\n\n");
  assert.equal(bodyUrls(body).length, 3);
  assert.deepEqual(citedDomains(body).sort(), ["columbus.gov", "dispatch.com"]);
  assert.deepEqual(citedDomains("No links at all here."), [], "an uncited body cites nothing");
  assert.deepEqual(citedDomains("[internal](https://columbusrealestatenews.com/blog/a)"), [], "self-links are not sources");
});

// --- market statistics ------------------------------------------------------

test("a human source_date yields its most recent real date", () => {
  assert.equal(parseSourceDate("July 2026 report, released August 12, 2026").toISOString().slice(0, 10), "2026-08-12");
  assert.equal(parseSourceDate("August 27, 2026").toISOString().slice(0, 10), "2026-08-27");
  assert.equal(parseSourceDate("2026-07-01").toISOString().slice(0, 10), "2026-07-01");
  assert.equal(parseSourceDate("July 2026").toISOString().slice(0, 10), "2026-07-01");
  assert.equal(parseSourceDate("sometime recently"), null, "an unparseable date must not read as fresh");
  assert.equal(parseSourceDate(null), null);
});

test("a weekly series gets a tighter staleness budget than a monthly one", () => {
  assert.equal(cadenceFor("30-Yr Mortgage Rate").advisoryDays, 21);
  assert.equal(cadenceFor("Median Sale Price").advisoryDays, 45);
  assert.equal(daysBetween(new Date("2026-08-01T00:00:00Z"), new Date("2026-09-04T00:00:00Z")), 34);
});

// --- authors ----------------------------------------------------------------

test("bylines that differ only in punctuation or case are one duplicate identity", () => {
  assert.equal(normalizeByline("CREN Newsroom"), normalizeByline("cren-newsroom"));
  const groups = duplicateGroups(["CREN Newsroom", "cren newsroom", "Jane Doe"]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].variants, ["CREN Newsroom", "cren newsroom"]);
  assert.deepEqual(duplicateGroups(["CREN Newsroom"]), []);
});

// --- disclosures ------------------------------------------------------------

test("the disclosure marker phrases still exist in the components they came from", () => {
  // If this fails, the copy changed and the disclosure check would silently
  // start asserting a phrase no page can ever contain.
  assert.deepEqual(verifyMarkers({ component: "components/funnel-disclosure.tsx", phrases: ["Straight talk before you send this", "How we get paid"] }), []);
  assert.deepEqual(verifyMarkers({ component: "components/ftc-disclosure.tsx", phrases: ["Some links below pay us if you buy"] }), []);
  assert.equal(verifyMarkers({ component: "components/ftc-disclosure.tsx", phrases: ["a phrase that is not there"] }).length, 1);
});

test("the FTC disclosure must appear before the first affiliate link, not merely on the page", () => {
  const above = '<p>Some links below pay us if you buy.</p><a href="/go/partner">Partner</a>';
  const below = '<a href="/go/partner">Partner</a><p>Some links below pay us if you buy.</p>';
  assert.ok(ftcDisclosureIndex(above) < firstAffiliateLinkIndex(above));
  assert.ok(ftcDisclosureIndex(below) > firstAffiliateLinkIndex(below));
  assert.equal(firstAffiliateLinkIndex("<p>nothing</p>"), -1);
  assert.equal(ftcDisclosureIndex("<p>nothing</p>"), -1);
});

test("the disclosure rule keys on a PAID link, not on the outbound click tracker", () => {
  // /go/* carries unpaid links too — Zillow, Realtor.com, the county auditor.
  // Demanding "some links below pay us" above an unpaid link would publish a
  // false statement, which is the opposite of what the rule is for.
  const unpaid = '<a href="/go/zillow-buy" rel="noopener noreferrer">Zillow</a>';
  assert.notEqual(firstAffiliateLinkIndex(unpaid), -1);
  assert.equal(firstSponsoredLinkIndex(unpaid), -1);

  const paid = '<p>Some links below pay us if you buy.</p><a href="/go/partner" rel="sponsored nofollow noopener noreferrer">Partner</a>';
  assert.notEqual(firstSponsoredLinkIndex(paid), -1);
  assert.ok(ftcDisclosureIndex(paid) < firstSponsoredLinkIndex(paid));
});

// --- write-path safety ------------------------------------------------------

test("every payload the lead-form check would send is classified as test traffic", () => {
  // The guarantee: a gate run can never manufacture something that reads as a
  // real lead. If this ever fails, the check refuses to send at all.
  assert.deepEqual(assertAllPayloadsAreTestTraffic(buildSmokeRequests({ runId: "sitequality-20260904" })), []);
});

test("a payload that would look like real audience is caught before it is sent", () => {
  const offenders = assertAllPayloadsAreTestTraffic([
    { route: "leads", email: "someone@gmail.com", source: "organic-search", payload: { message: "I want to sell my house" } },
  ]);
  assert.equal(offenders.length, 1);
});

// --- misc -------------------------------------------------------------------

test("percentiles are order-statistic based and empty input yields null", () => {
  assert.equal(percentile([10, 20, 30, 40], 50), 20);
  assert.equal(percentile([10, 20, 30, 40], 100), 40);
  assert.equal(percentile([], 50), null);
});

test("the readiness audit's JSON is recovered even with leading log lines", () => {
  assert.deepEqual(parseAuditJson('some log\n{"ok":true,"findings":[]}'), { ok: true, findings: [] });
  assert.equal(parseAuditJson("no json here"), null);
});

test("the image audit's JSON becomes one finding per broken hero, not a raw dump", () => {
  const report = parseAuditReport('{"ok":false,"missing":[{"id":"a","title":"A"}],"broken":[]}');
  assert.equal(report.missing.length, 1);
  assert.equal(parseAuditReport("crashed before printing"), null);
});

// --- titles and meta descriptions -------------------------------------------

test("pages serving an identical title or description are grouped, not counted twice", () => {
  const groups = duplicates([
    ["/buy", "Columbus Real Estate News | Local Housing & Living Intelligence"],
    ["/rent", "Columbus Real Estate News | Local Housing & Living Intelligence"],
    ["/sell", "Columbus Real Estate News | Local Housing & Living Intelligence"],
    ["/about", "About CREN and Our Columbus Coverage | Columbus Real Estate News"],
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0][1], ["/buy", "/rent", "/sell"]);
});

test("a page that serves no title at all is not reported as a duplicate of another blank", () => {
  assert.deepEqual(duplicates([["/a", ""], ["/b", ""]]), []);
});

test("the brand appearing twice in one title is reported even when the length is fine", () => {
  const notes = lengthNotes(
    "/join",
    "Join Columbus Real Estate News, Free | Columbus Real Estate News",
    "x".repeat(150),
  );
  assert.equal(notes.length, 1);
  assert.match(notes[0], /repeats "Columbus Real Estate News" twice/);
});

test("titles and descriptions inside the convention produce no notes", () => {
  assert.deepEqual(lengthNotes("/sell/your-home", "x".repeat(60), "y".repeat(150)), []);
});

test("an editorial headline is not measured against the template title convention", () => {
  const headline = `${"x".repeat(70)} | Columbus Real Estate News`;
  assert.deepEqual(lengthNotes("/blog/a-long-columbus-headline", headline, "y".repeat(150)), []);
  // ...but the same length on a hand-authored page still is.
  assert.equal(lengthNotes("/resources", headline, "y".repeat(150)).length, 1);
  // ...and a description is measured everywhere, article or not.
  assert.equal(lengthNotes("/blog/a-long-columbus-headline", headline, "y".repeat(199)).length, 1);
});

test("a local target maps the production URLs its own sitemap emits", () => {
  // metadataBase makes a locally served sitemap name production URLs. If those
  // do not map back, `--target local` inspects only the 16 CRITICAL_PATHS and
  // reports a confident PASS on a third of the site.
  const local = resolveTarget("local");
  assert.deepEqual(acceptedOrigins(local), ["https://columbusrealestatenews.com"]);
  assert.equal(
    pathFromUrl("https://columbusrealestatenews.com/areas/bexley", local.origin, acceptedOrigins(local)),
    "/areas/bexley",
  );
});

test("production stays strict about off-origin sitemap URLs", () => {
  const production = resolveTarget("production");
  assert.deepEqual(acceptedOrigins(production), []);
  assert.equal(pathFromUrl("https://someone-else.test/x", production.origin, acceptedOrigins(production)), null);
});

test("the metadata check is registered in the suite", () => {
  assert.ok(CHECK_IDS.includes("metadata"), "verify:site would silently stop checking titles and descriptions");
});

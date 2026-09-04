// The registry and the runner.
//
// Every check is a plain object { id, title, blocking, run(context) } and every
// run() returns exactly one result from result.mjs. The runner adds nothing
// clever: it builds the shared context (one fetch of each corpus page, one DB
// handle), runs each check, and reports. A check that throws becomes an ERROR
// result — never a silent pass, never a swallowed exception.

import { createHttpClient } from "./http.mjs";
import { loadCorpus } from "./corpus.mjs";
import { fetchPages } from "./pages.mjs";
import { ERROR, FAIL, PASS, SKIP, isBlockingFailure, result } from "./result.mjs";
import { redact } from "./db.mjs";

import { internalLinks, externalLinks } from "./checks/links.mjs";
import { sources } from "./checks/sources.mjs";
import { marketConsistency, marketFreshness, marketDeployed } from "./checks/stale-stats.mjs";
import { authors, renderedBylines } from "./checks/authors.mjs";
import { funnelDisclosures, affiliateDisclosure, disclosurePolicyPages } from "./checks/disclosures.mjs";
import { leadFormValidation, leadFormSubmission } from "./checks/lead-form.mjs";
import { analyticsMounted, analyticsFlowing, analyticsWritable } from "./checks/analytics.mjs";
import { schemaMarkup } from "./checks/schema.mjs";
import { indexability, canonicals } from "./checks/indexability.mjs";
import { imagePolicy, imagesReachable, renderedImages } from "./checks/images.mjs";
import { responsePerformance, webVitals } from "./checks/performance.mjs";
import { dataReadiness } from "./checks/readiness.mjs";

/** Registry order is report order: infrastructure first, then content, then polish. */
export const CHECKS = [
  internalLinks,
  externalLinks,
  indexability,
  canonicals,
  schemaMarkup,
  disclosurePolicyPages,
  funnelDisclosures,
  affiliateDisclosure,
  leadFormValidation,
  leadFormSubmission,
  analyticsMounted,
  analyticsFlowing,
  analyticsWritable,
  marketConsistency,
  marketFreshness,
  marketDeployed,
  authors,
  renderedBylines,
  sources,
  imagePolicy,
  imagesReachable,
  renderedImages,
  dataReadiness,
  responsePerformance,
  webVitals,
];

export const CHECK_IDS = CHECKS.map((check) => check.id);

export async function runSuite(options) {
  const http = createHttpClient({ timeoutMs: options.timeoutMs });
  const started = Date.now();

  const corpus = await loadCorpus(http, options.target, {
    articles: options.sampleArticles,
    areas: options.sampleAreas,
    topics: options.sampleTopics,
    full: options.full,
  });
  const pages = await fetchPages(http, options.target, corpus.paths, { concurrency: options.concurrency });

  const context = { target: options.target, http, corpus, pages, options, now: options.now ?? new Date() };

  const selected = CHECKS.filter((check) => {
    if (options.only.length > 0) return options.only.includes(check.id);
    return !options.skip.includes(check.id);
  });

  const results = [];
  for (const check of CHECKS) {
    if (!selected.includes(check)) {
      const excluded = result({
        id: check.id,
        title: check.title,
        blocking: check.blocking,
        status: SKIP,
        summary: "not run: excluded by --only/--skip",
        reason: "excluded on the command line",
      });
      excluded.excluded = true;
      results.push(excluded);
      continue;
    }
    const checkStarted = Date.now();
    let entry;
    try {
      entry = await check.run(context);
    } catch (error) {
      entry = result({
        id: check.id,
        title: check.title,
        blocking: true,
        status: ERROR,
        summary: "the check itself failed",
        findings: [redact(error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error)).split("\n").slice(0, 6).join(" | ")],
      });
    }
    entry.durationMs = Date.now() - checkStarted;
    results.push(entry);
  }

  const blocking = results.filter(isBlockingFailure);
  const advisory = results.filter((entry) => entry.status === FAIL && !entry.blocking);
  const skipped = results.filter((entry) => entry.status === SKIP);
  // --require-all is about coverage the ENVIRONMENT denied us, not about checks
  // the operator deliberately narrowed to with --only/--skip.
  const requiredSkips = options.requireAll ? skipped.filter((entry) => !entry.excluded) : [];

  return {
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
    target: options.target,
    corpus: {
      sitemapUrls: corpus.ok ? corpus.sitemapUrls.length : 0,
      pagesFetched: pages.size,
      sampled: corpus.sampled ?? false,
      reason: corpus.reason,
    },
    httpRequests: http.requestCount(),
    results,
    counts: {
      pass: results.filter((entry) => entry.status === PASS).length,
      blockingFailures: blocking.length,
      advisoryFailures: advisory.length,
      skipped: skipped.length,
      errors: results.filter((entry) => entry.status === ERROR).length,
    },
    ok: blocking.length === 0 && requiredSkips.length === 0,
    requireAllViolations: requiredSkips.map((entry) => entry.id),
  };
}

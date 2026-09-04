// Page performance.
//
// Honest scope, stated up front: this measures SERVER response — how long the
// target took to hand back the document, and how big that document was. It is
// not a Core Web Vitals measurement. There is no browser in this environment,
// so LCP/CLS/INP cannot be observed here, and the suite says so out loud in a
// separate check rather than letting a green "performance" line imply coverage
// it does not have.
//
// Measurements are taken from the requests the other checks already made, so
// running this costs no extra traffic.

import { fail, pass, skip, verdict } from "../result.mjs";
import { url as targetUrl } from "../target.mjs";

export function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export const responsePerformance = {
  id: "performance",
  title: "Server response performance",
  blocking: true,
  async run(context) {
    const budgets = context.options.performance;
    const documents = [...context.pages.entries()]
      .filter(([, response]) => response.status !== null && response.contentType.includes("text/html"))
      .map(([path, response]) => ({ path, ms: response.ms, bytes: response.bytes }));

    if (documents.length === 0) {
      return skip("performance", "Server response performance", true, "no HTML document was fetched from the target, so nothing was timed");
    }

    const times = documents.map((entry) => entry.ms);
    const p50 = percentile(times, 50);
    const p75 = percentile(times, 75);
    const p95 = percentile(times, 95);
    const stats = {
      documents: documents.length,
      p50Ms: p50,
      p75Ms: p75,
      p95Ms: p95,
      slowest: [...documents].sort((left, right) => right.ms - left.ms).slice(0, 5),
      largest: [...documents].sort((left, right) => right.bytes - left.bytes).slice(0, 5),
    };

    const blocking = [];
    const advisory = [];
    for (const entry of documents) {
      if (entry.ms > budgets.hardMs) blocking.push(`${entry.path} took ${entry.ms}ms (hard ceiling ${budgets.hardMs}ms)`);
      else if (entry.ms > budgets.softMs) advisory.push(`${entry.path} took ${entry.ms}ms (budget ${budgets.softMs}ms)`);
      if (entry.bytes > budgets.hardBytes) blocking.push(`${entry.path} returned ${Math.round(entry.bytes / 1024)}KB of HTML (hard ceiling ${Math.round(budgets.hardBytes / 1024)}KB)`);
      else if (entry.bytes > budgets.softBytes) advisory.push(`${entry.path} returned ${Math.round(entry.bytes / 1024)}KB of HTML (budget ${Math.round(budgets.softBytes / 1024)}KB)`);
    }
    if (p75 !== null && p75 > budgets.p75Ms) {
      advisory.push(`p75 document response is ${p75}ms across ${documents.length} page(s) (budget ${budgets.p75Ms}ms)`);
    }

    if (blocking.length > 0) {
      return fail("performance", "Server response performance", true, `${blocking.length} page(s) past a hard performance ceiling`, [...blocking, ...advisory], stats);
    }
    if (advisory.length > 0) {
      return fail("performance", "Server response performance", false, `${advisory.length} page(s) over budget (p50 ${p50}ms / p75 ${p75}ms / p95 ${p95}ms)`, advisory, stats);
    }
    return pass("performance", "Server response performance", true, `${documents.length} page(s): p50 ${p50}ms, p75 ${p75}ms, p95 ${p95}ms, all inside budget`, stats);
  },
};

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export const webVitals = {
  id: "performance-web-vitals",
  title: "Core Web Vitals",
  blocking: false,
  async run(context) {
    if (!context.options.webVitals) {
      return skip(
        "performance-web-vitals",
        "Core Web Vitals",
        false,
        "not measured: there is no browser in this environment, so LCP/CLS/INP cannot be observed locally. Pass --web-vitals to query the public PageSpeed Insights API for the target instead. The `performance` check above measures server response only and does NOT cover this.",
      );
    }
    if (!context.target.isProduction) {
      return skip(
        "performance-web-vitals",
        "Core Web Vitals",
        false,
        `PageSpeed Insights can only reach a publicly resolvable URL; ${context.target.origin} is not one`,
      );
    }

    const findings = [];
    const stats = {};
    for (const path of ["/", "/blog"]) {
      const query = new URLSearchParams({ url: targetUrl(context.target, path), strategy: "mobile" });
      if (process.env.CREN_PSI_API_KEY) query.set("key", process.env.CREN_PSI_API_KEY);
      const response = await context.http.get(`${PSI_ENDPOINT}?${query.toString()}`);
      if (!response.ok) {
        return skip(
          "performance-web-vitals",
          "Core Web Vitals",
          false,
          `PageSpeed Insights did not answer for ${path} (${response.error ?? `HTTP ${response.status}`}); set CREN_PSI_API_KEY if this is rate limiting`,
        );
      }
      let payload;
      try {
        payload = JSON.parse(response.text);
      } catch {
        return skip("performance-web-vitals", "Core Web Vitals", false, "PageSpeed Insights returned a body that is not JSON");
      }
      const score = payload?.lighthouseResult?.categories?.performance?.score;
      stats[path] = { performanceScore: score === undefined ? null : Math.round(score * 100) };
      if (typeof score === "number" && score * 100 < context.options.performance.lighthouseMin) {
        findings.push(`${path} — Lighthouse mobile performance ${Math.round(score * 100)} (budget ${context.options.performance.lighthouseMin})`);
      }
    }

    return verdict(
      "performance-web-vitals",
      "Core Web Vitals",
      false,
      findings,
      `PageSpeed Insights mobile performance inside budget: ${JSON.stringify(stats)}`,
      `${findings.length} page(s) below the Lighthouse performance budget`,
      stats,
    );
  },
};

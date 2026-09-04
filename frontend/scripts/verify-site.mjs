#!/usr/bin/env node
// One command that gates a deploy at the product layer.
//
//   npm run verify:site                        # against production, read-only
//   npm run verify:site -- --target local      # against a local `next start`
//   npm run verify:site -- --full --json       # every sitemap URL, JSON out
//
// Exits non-zero when any BLOCKING check fails, so it can sit in front of a
// deploy. Advisory findings are printed but never block. A check that cannot
// run reports SKIPPED with its reason and is never counted as a pass; add
// --require-all to make a skip blocking too.
//
// Owner plan 2026-09-04, item 12. The newsroom is already fail-closed at the
// editorial layer (scripts/publish-article.mjs); this is the same posture for
// the product.

import { fileURLToPath } from "node:url";
import { CHECK_IDS, runSuite } from "./site-quality/runner.mjs";
import { formatReport } from "./site-quality/report.mjs";
import { redact } from "./site-quality/db.mjs";
import { resolveTarget } from "./site-quality/target.mjs";

const DEFAULTS = {
  timeoutMs: 20_000,
  concurrency: 6,
  sampleArticles: 8,
  sampleAreas: 5,
  sampleTopics: 3,
  analyticsSilenceDays: 3,
  imageTimeoutMs: 420_000,
  performance: {
    softMs: 2_000,
    hardMs: 8_000,
    p75Ms: 2_500,
    softBytes: 400 * 1024,
    hardBytes: 1_500 * 1024,
    lighthouseMin: 70,
  },
};

export function usage() {
  return [
    "Usage: node scripts/verify-site.mjs [options]",
    "",
    "Runs the product-layer quality gates: links, sources, stale statistics,",
    "author taxonomy, disclosures, lead-form submission, analytics events,",
    "schema markup, indexability, canonicals, image integrity, performance.",
    "",
    "Options:",
    "  --target <production|local|url>  What to check. Default: production.",
    "  --allow-write                    Permit write-path checks against a production",
    "                                   target. Submissions are test-traffic marked and",
    "                                   deleted afterwards. Off by default.",
    "  --full                           Check every sitemap URL, not a sample.",
    "  --external-links                 Also check outbound source links in articles.",
    "  --web-vitals                     Query the PageSpeed Insights API (production only).",
    "  --require-all                    Treat any SKIPPED check as a blocking failure.",
    "  --only <id[,id]>                 Run only these checks.",
    "  --skip <id[,id]>                 Run everything except these checks.",
    "  --sample-articles <n>            Article pages to inspect. Default: 8.",
    "  --timeout-ms <ms>                Per-request timeout. Default: 20000.",
    "  --image-timeout-ms <ms>          Budget for the hero-image sweep. Default: 420000.",
    "  --json                           Emit the full machine-readable report.",
    "  --help                           Show this message.",
    "",
    `Check ids: ${CHECK_IDS.join(", ")}`,
  ].join("\n");
}

function list(value, flag) {
  const items = String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const unknown = items.filter((entry) => !CHECK_IDS.includes(entry));
  if (unknown.length > 0) throw new Error(`${flag}: unknown check id(s): ${unknown.join(", ")}`);
  return items;
}

function integer(value, flag, { min, max }) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer from ${min} through ${max}`);
  }
  return parsed;
}

export function parseArgs(argv) {
  const options = {
    ...DEFAULTS,
    performance: { ...DEFAULTS.performance },
    targetSpec: process.env.CREN_VERIFY_TARGET || "production",
    allowWrite: false,
    full: false,
    externalLinks: false,
    webVitals: false,
    requireAll: false,
    only: [],
    skip: [],
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (argv[index] === undefined) throw new Error(`${arg} requires a value`);
      return argv[index];
    };
    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--target":
        options.targetSpec = next();
        break;
      case "--allow-write":
        options.allowWrite = true;
        break;
      case "--full":
        options.full = true;
        break;
      case "--external-links":
        options.externalLinks = true;
        break;
      case "--web-vitals":
        options.webVitals = true;
        break;
      case "--require-all":
        options.requireAll = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--only":
        options.only = list(next(), "--only");
        break;
      case "--skip":
        options.skip = list(next(), "--skip");
        break;
      case "--sample-articles":
        options.sampleArticles = integer(next(), "--sample-articles", { min: 0, max: 500 });
        break;
      case "--timeout-ms":
        options.timeoutMs = integer(next(), "--timeout-ms", { min: 1_000, max: 120_000 });
        break;
      case "--image-timeout-ms":
        options.imageTimeoutMs = integer(next(), "--image-timeout-ms", { min: 10_000, max: 1_800_000 });
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.only.length > 0 && options.skip.length > 0) {
    throw new Error("--only and --skip cannot be combined");
  }
  options.target = resolveTarget(options.targetSpec, { allowWrite: options.allowWrite });
  return options;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(redact(error instanceof Error ? error.message : String(error)));
    console.error("");
    console.error(usage());
    process.exit(2);
  }

  if (options.help) {
    console.log(usage());
    return;
  }

  const report = await runSuite(options);
  if (options.json) {
    console.log(JSON.stringify({ ...report, target: { ...report.target } }, null, 2));
  } else {
    console.log(formatReport(report));
  }
  process.exit(report.ok ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

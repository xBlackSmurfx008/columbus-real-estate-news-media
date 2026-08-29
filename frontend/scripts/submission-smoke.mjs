#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL = "http://localhost:3000";
const ROUTE_ORDER = ["contact", "subscribe", "leads", "members"];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function usage() {
  return [
    "Usage: node scripts/submission-smoke.mjs [options]",
    "",
    "Dry-run is the default. Use --execute to send controlled public submissions.",
    "",
    "Options:",
    "  --base-url <url>       Target origin. Default: CREN_SMOKE_BASE_URL or http://localhost:3000",
    "  --execute              Send POST requests. Without this, only prints the plan.",
    "  --invalid-payload      Send validation-only bad payloads expecting 400 responses.",
    "  --allow-remote         Required with --execute for non-localhost base URLs.",
    "  --verify-db            Read-only verification of valid smoke rows when DATABASE_URL is present.",
    "  --route <name[,name]>  Limit to contact, subscribe, leads, and/or members.",
    "  --run-id <id>          Stable run id for reruns. Default is unique.",
    "  --timeout-ms <ms>      Per-request timeout. Default: 10000.",
    "  --json                 Print a JSON summary.",
    "  --help                 Show this help.",
  ].join("\n");
}

export function createRunId(now = new Date()) {
  const stamp = now.toISOString().replace(/[^0-9a-z]/gi, "").slice(0, 15).toLowerCase();
  return normalizeRunId(`${stamp}-${randomBytes(4).toString("hex")}`);
}

export function normalizeRunId(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  if (!normalized) throw new Error("run id must contain at least one letter or number");
  return normalized;
}

function sourceMarker(runId, route) {
  return `codex-smoke:${runId}:${route}`.slice(0, 120);
}

function smokeEmail(runId, route) {
  const emailRunId = runId.replace(/[^a-z0-9-]+/g, "-").slice(0, 48);
  return `codex.smoke+${emailRunId}-${route}@example.com`;
}

function invalidEmail(route) {
  return `codex-smoke-invalid-${route}`;
}

export function buildSmokeRequests({ runId = createRunId(), routes = ROUTE_ORDER, invalidPayload = false } = {}) {
  const cleanRunId = normalizeRunId(runId);
  const routeSet = new Set(routes);
  const requests = [
    {
      route: "contact",
      endpoint: "/api/contact",
      expectedStatus: invalidPayload ? 400 : 201,
      email: invalidPayload ? invalidEmail("contact") : smokeEmail(cleanRunId, "contact"),
      source: sourceMarker(cleanRunId, "contact"),
      payload: {
        name: "Codex Smoke Contact",
        email: invalidPayload ? invalidEmail("contact") : smokeEmail(cleanRunId, "contact"),
        message: `Controlled CREN public submission smoke test. Run ${cleanRunId}. Do not contact.`,
        source: sourceMarker(cleanRunId, "contact"),
        inquiry_type: "general",
      },
    },
    {
      route: "subscribe",
      endpoint: "/api/subscribe",
      expectedStatus: invalidPayload ? 400 : 201,
      email: invalidPayload ? invalidEmail("subscribe") : smokeEmail(cleanRunId, "subscribe"),
      source: sourceMarker(cleanRunId, "subscribe"),
      payload: {
        email: invalidPayload ? invalidEmail("subscribe") : smokeEmail(cleanRunId, "subscribe"),
        area: "Dublin",
        topic: "Submission smoke test",
        source: sourceMarker(cleanRunId, "subscribe"),
        role: "buyer",
        cadence: "weekly",
        timeline: "3-6 months",
        budget: "smoke-test",
        interests: ["Telegram alerts", "Submission routing"],
      },
    },
    {
      route: "leads",
      endpoint: "/api/leads",
      expectedStatus: invalidPayload ? 400 : 201,
      email: invalidPayload ? invalidEmail("leads") : smokeEmail(cleanRunId, "leads"),
      source: sourceMarker(cleanRunId, "leads"),
      payload: {
        persona: "renter",
        name: "Codex Smoke Lead",
        email: invalidPayload ? invalidEmail("leads") : smokeEmail(cleanRunId, "leads"),
        phone: "614-555-0100",
        area: "Columbus",
        details: {
          run_id: cleanRunId,
          source_marker: sourceMarker(cleanRunId, "leads"),
          purpose: "Controlled CREN public submission smoke test.",
        },
        source: sourceMarker(cleanRunId, "leads"),
        consent: true,
      },
    },
    {
      route: "members",
      endpoint: "/api/members",
      expectedStatus: invalidPayload ? 400 : 201,
      email: invalidPayload ? invalidEmail("members") : smokeEmail(cleanRunId, "members"),
      source: sourceMarker(cleanRunId, "members"),
      payload: {
        email: invalidPayload ? invalidEmail("members") : smokeEmail(cleanRunId, "members"),
        name: "Codex Smoke Member",
        interests: `Submission smoke test | ${sourceMarker(cleanRunId, "members")}`,
        source: sourceMarker(cleanRunId, "members"),
      },
    },
  ];
  return requests.filter((request) => routeSet.has(request.route));
}

export function parseSmokeArgs(argv, env = process.env) {
  const options = {
    baseUrl: env.CREN_SMOKE_BASE_URL || DEFAULT_BASE_URL,
    execute: false,
    allowRemote: false,
    verifyDb: false,
    invalidPayload: false,
    routes: [...ROUTE_ORDER],
    runId: env.CREN_SMOKE_RUN_ID ? normalizeRunId(env.CREN_SMOKE_RUN_ID) : createRunId(),
    timeoutMs: 10_000,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--execute") {
      options.execute = true;
    } else if (arg === "--dry-run") {
      options.execute = false;
    } else if (arg === "--allow-remote") {
      options.allowRemote = true;
    } else if (arg === "--verify-db") {
      options.verifyDb = true;
    } else if (arg === "--invalid-payload") {
      options.invalidPayload = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--base-url") {
      index += 1;
      if (!argv[index]) throw new Error("--base-url requires a URL");
      options.baseUrl = argv[index];
    } else if (arg === "--route" || arg === "--only") {
      index += 1;
      if (!argv[index]) throw new Error(`${arg} requires at least one route`);
      options.routes = parseRoutes(argv[index]);
    } else if (arg === "--run-id") {
      index += 1;
      if (!argv[index]) throw new Error("--run-id requires a value");
      options.runId = normalizeRunId(argv[index]);
    } else if (arg === "--timeout-ms") {
      index += 1;
      if (!argv[index]) throw new Error("--timeout-ms requires a value");
      const timeoutMs = Number(argv[index]);
      if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60_000) {
        throw new Error("--timeout-ms must be an integer from 1000 through 60000");
      }
      options.timeoutMs = timeoutMs;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  options.baseUrl = normalizeBaseUrl(options.baseUrl);
  assertExecutionAllowed(options);
  return options;
}

function parseRoutes(value) {
  const routes = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (routes.length === 0) throw new Error("route list cannot be empty");
  const invalid = routes.filter((route) => !ROUTE_ORDER.includes(route));
  if (invalid.length > 0) throw new Error(`Unknown route(s): ${invalid.join(", ")}`);
  return [...new Set(routes)];
}

export function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (url.username || url.password) {
    throw new Error("Base URL must not include credentials.");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function isLocalBaseUrl(baseUrl) {
  const url = new URL(baseUrl);
  return LOCAL_HOSTS.has(url.hostname);
}

export function assertExecutionAllowed(options) {
  if (!options.execute) return;
  if (!isLocalBaseUrl(options.baseUrl) && !options.allowRemote) {
    throw new Error("Refusing to execute against a non-local base URL without --allow-remote.");
  }
}

export function redactSensitiveText(value) {
  return String(value)
    .replace(/\b\d{7,12}:[A-Za-z0-9_-]{25,}\b/g, "[redacted-telegram-token]")
    .replace(/\b(postgres(?:ql)?:\/\/)[^\s'")]+/gi, "$1[redacted-database-url]");
}

function summarizeResponseBody(text) {
  const cleaned = redactSensitiveText(text).replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 300);
}

async function postJson({ baseUrl, request, fetchImpl = fetch, timeoutMs }) {
  const url = new URL(request.endpoint, `${baseUrl}/`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "CRENSubmissionSmoke/1.0",
      },
      body: JSON.stringify(request.payload),
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      route: request.route,
      endpoint: request.endpoint,
      expectedStatus: request.expectedStatus,
      status: response.status,
      ok: response.status === request.expectedStatus,
      body: response.status === request.expectedStatus ? undefined : summarizeResponseBody(body),
    };
  } catch (error) {
    return {
      route: request.route,
      endpoint: request.endpoint,
      expectedStatus: request.expectedStatus,
      status: null,
      ok: false,
      error: error instanceof Error && error.name === "AbortError" ? "REQUEST_TIMEOUT" : "REQUEST_FAILED",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function verifyOne(sql, request) {
  if (request.route === "contact") {
    const rows = await sql`
      SELECT id, created_at FROM contacts
      WHERE email = ${request.email} AND source = ${request.source}
      ORDER BY created_at DESC
      LIMIT 3
    `;
    return { route: request.route, table: "contacts", ok: rows.length > 0, matches: rows.length, ids: rows.map((row) => row.id) };
  }
  if (request.route === "subscribe") {
    const rows = await sql`
      SELECT id, created_at FROM subscribers
      WHERE email = ${request.email} AND source LIKE ${`${request.source}%`}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 3
    `;
    return { route: request.route, table: "subscribers", ok: rows.length > 0, matches: rows.length, ids: rows.map((row) => row.id) };
  }
  if (request.route === "leads") {
    const rows = await sql`
      SELECT id, created_at FROM leads
      WHERE email = ${request.email} AND source = ${request.source}
      ORDER BY created_at DESC
      LIMIT 3
    `;
    return { route: request.route, table: "leads", ok: rows.length > 0, matches: rows.length, ids: rows.map((row) => row.id) };
  }
  if (request.route === "members") {
    const rows = await sql`
      SELECT id, created_at FROM members
      WHERE email = ${request.email} AND interests LIKE ${`%${request.source}%`}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 3
    `;
    return { route: request.route, table: "members", ok: rows.length > 0, matches: rows.length, ids: rows.map((row) => row.id) };
  }
  throw new Error(`Unsupported route: ${request.route}`);
}

export async function verifyDbRecords({ requests, databaseUrl = process.env.DATABASE_URL }) {
  if (!databaseUrl) return { skipped: true, reason: "DATABASE_URL_NOT_SET", results: [] };
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(databaseUrl);
  const results = [];
  for (const request of requests) {
    results.push(await verifyOne(sql, request));
  }
  return {
    skipped: false,
    ok: results.every((result) => result.ok),
    results,
  };
}

function printPlan(options, requests) {
  console.log(`CREN public submission smoke (${options.execute ? "execute" : "dry-run"})`);
  console.log(`Base URL: ${options.baseUrl}`);
  console.log(`Run ID: ${options.runId}`);
  console.log(`Payload mode: ${options.invalidPayload ? "invalid-payload validation (expects no records)" : "valid codex-smoke records"}`);
  console.log("This script never deletes records; valid executed smoke rows remain until a separately approved cleanup.");
  for (const request of requests) {
    console.log(`- ${request.route}: POST ${request.endpoint} -> ${request.expectedStatus} | ${request.email} | ${request.source}`);
  }
}

function printSummary(summary) {
  if (summary.options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  printPlan(summary.options, summary.requests);
  if (summary.dryRun) {
    console.log("Dry-run only. Add --execute to send requests.");
    return;
  }

  console.log("HTTP results:");
  for (const result of summary.httpResults) {
    const status = result.status === null ? "no response" : result.status;
    console.log(`- ${result.route}: ${result.ok ? "ok" : "failed"} (${status}; expected ${result.expectedStatus})`);
    if (result.body) console.log(`  Response: ${result.body}`);
    if (result.error) console.log(`  Error: ${result.error}`);
  }

  if (summary.dbVerification?.skipped) {
    console.log(`DB verification skipped: ${summary.dbVerification.reason}`);
  } else if (summary.dbVerification) {
    console.log("DB verification:");
    for (const result of summary.dbVerification.results) {
      console.log(`- ${result.route}: ${result.ok ? "found" : "missing"} in ${result.table} (${result.matches} match(es))`);
    }
  }
}

export async function runSubmissionSmoke(options, deps = {}) {
  const requests = buildSmokeRequests({
    runId: options.runId,
    routes: options.routes,
    invalidPayload: options.invalidPayload,
  });
  const summary = {
    options,
    requests: requests.map((request) => ({
      route: request.route,
      endpoint: request.endpoint,
      expectedStatus: request.expectedStatus,
      email: request.email,
      source: request.source,
    })),
    dryRun: !options.execute,
    httpResults: [],
    dbVerification: null,
  };

  if (!options.execute) return summary;

  for (const request of requests) {
    summary.httpResults.push(await postJson({
      baseUrl: options.baseUrl,
      request,
      fetchImpl: deps.fetchImpl ?? fetch,
      timeoutMs: options.timeoutMs,
    }));
  }

  if (options.verifyDb && options.invalidPayload) {
    summary.dbVerification = { skipped: true, reason: "INVALID_PAYLOAD_MODE", results: [] };
  } else if (options.verifyDb) {
    summary.dbVerification = await verifyDbRecords({ requests, databaseUrl: deps.databaseUrl ?? process.env.DATABASE_URL });
  }

  return summary;
}

function summaryOk(summary) {
  if (summary.dryRun) return true;
  const httpOk = summary.httpResults.every((result) => result.ok);
  const dbOk = !summary.dbVerification || summary.dbVerification.skipped || summary.dbVerification.ok;
  return httpOk && dbOk;
}

async function main() {
  try {
    const options = parseSmokeArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    const summary = await runSubmissionSmoke(options);
    printSummary(summary);
    if (!summaryOk(summary)) process.exitCode = 1;
  } catch (error) {
    console.error(redactSensitiveText(error instanceof Error ? error.message : String(error)));
    console.error("");
    console.error(usage());
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

#!/usr/bin/env node
// Launch-specific production monitor for CREN commercial readiness.
//
// Usage:
//   node --env-file=.env.production.local scripts/launch-monitor.mjs \
//     --expected-deployment dpl_AFrXs6nu7Un6v18W9LV3wiH319c2

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");

const defaultPaths = [
  "/",
  "/advertise/media-kit",
  "/advertise/self-service",
  "/profiles",
  "/profiles/claim",
  "/policies",
];

function parseArgs(argv) {
  const options = {
    baseUrl: "https://columbusrealestatenews.com",
    expectedDeployment: "",
    paths: [...defaultPaths],
    json: false,
    skipVercel: false,
    skipReadiness: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--base-url" && next) {
      options.baseUrl = next;
      index += 1;
    } else if (arg === "--expected-deployment" && next) {
      options.expectedDeployment = next;
      index += 1;
    } else if (arg === "--path" && next) {
      options.paths.push(next);
      index += 1;
    } else if (arg === "--only-path" && next) {
      options.paths = [next];
      index += 1;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--skip-vercel") {
      options.skipVercel = true;
    } else if (arg === "--skip-readiness") {
      options.skipReadiness = true;
    } else if (arg === "--help") {
      options.help = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  options.baseUrl = options.baseUrl.replace(/\/$/, "");
  return options;
}

function usage() {
  return [
    "Usage: node --env-file=.env.production.local scripts/launch-monitor.mjs [options]",
    "",
    "Options:",
    "  --base-url <url>                 Site to check. Defaults to https://columbusrealestatenews.com",
    "  --expected-deployment <dpl_id>    Fail if Vercel inspect reports a different deployment id.",
    "  --path <path>                     Add an extra path check.",
    "  --only-path <path>                Check only one path.",
    "  --skip-vercel                    Skip Vercel alias inspection.",
    "  --skip-readiness                 Skip production-readiness audit.",
    "  --json                           Print JSON only.",
  ].join("\n");
}

function run(command, args) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolveRun({ ok: false, code: null, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      resolveRun({ ok: code === 0, code, stdout, stderr });
    });
  });
}

async function checkRoute(baseUrl, path) {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = { "user-agent": "CREN-launch-monitor/1.0" };
  const startedAt = Date.now();

  async function request(method) {
    return fetch(url, {
      method,
      redirect: "follow",
      headers,
      signal: AbortSignal.timeout(20_000),
    });
  }

  try {
    let response = await request("HEAD");
    if (response.status === 405) {
      response = await request("GET");
    }

    return {
      path,
      url,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      matchedPath: response.headers.get("x-matched-path"),
      cache: response.headers.get("x-vercel-cache"),
    };
  } catch (error) {
    return {
      path,
      url,
      ok: false,
      status: null,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseInspectOutput(output) {
  const idMatch = output.match(/\bid\s+(dpl_[A-Za-z0-9]+)/);
  const urlMatch = output.match(/\burl\s+(https:\/\/\S+)/);
  return {
    deploymentId: idMatch?.[1] ?? null,
    deploymentUrl: urlMatch?.[1] ?? null,
  };
}

async function inspectVercelAlias(baseUrl, expectedDeployment) {
  const hostname = new URL(baseUrl).hostname;
  const result = await run("vercel", ["inspect", hostname]);
  const parsed = parseInspectOutput(`${result.stdout}\n${result.stderr}`);
  return {
    ok: result.ok && (!expectedDeployment || parsed.deploymentId === expectedDeployment),
    commandOk: result.ok,
    hostname,
    expectedDeployment: expectedDeployment || null,
    ...parsed,
    stderr: result.stderr.trim() || undefined,
  };
}

function parseJsonOutput(stdout) {
  const firstBrace = stdout.indexOf("{");
  if (firstBrace === -1) return null;
  try {
    return JSON.parse(stdout.slice(firstBrace));
  } catch {
    return null;
  }
}

async function runReadinessAudit() {
  if (!process.env.DATABASE_URL) {
    return { ok: true, skipped: true, reason: "DATABASE_URL is not set" };
  }

  const result = await run(process.execPath, ["scripts/production-readiness-audit.mjs"]);
  const report = parseJsonOutput(result.stdout);
  return {
    ok: result.ok && report?.ok === true,
    skipped: false,
    commandOk: result.ok,
    report,
    stderr: result.stderr.trim() || undefined,
  };
}

function summarize(report) {
  const lines = [];
  lines.push(`CREN launch monitor: ${report.ok ? "PASS" : "FAIL"}`);
  lines.push(`Checked at: ${report.checkedAt}`);
  lines.push(`Base URL: ${report.baseUrl}`);
  for (const route of report.routes) {
    lines.push(
      `${route.ok ? "OK" : "FAIL"} ${route.path}: ${route.status ?? "error"} ${route.matchedPath ? `(${route.matchedPath})` : ""}`.trim(),
    );
  }
  if (report.vercel) {
    lines.push(
      `${report.vercel.ok ? "OK" : "FAIL"} alias: ${report.vercel.hostname} -> ${report.vercel.deploymentId ?? "unknown"}`,
    );
  }
  if (report.readiness) {
    if (report.readiness.skipped) {
      lines.push(`SKIP readiness: ${report.readiness.reason}`);
    } else {
      lines.push(
        `${report.readiness.ok ? "OK" : "FAIL"} readiness: findings ${report.readiness.report?.findings?.length ?? "unknown"}`,
      );
    }
  }
  if (report.findings.length > 0) {
    lines.push("");
    lines.push("Findings:");
    for (const finding of report.findings) lines.push(`- ${finding}`);
  }
  return lines.join("\n");
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(usage());
  process.exit(0);
}

const report = {
  checkedAt: new Date().toISOString(),
  baseUrl: options.baseUrl,
  expectedDeployment: options.expectedDeployment || null,
  ok: true,
  routes: [],
  vercel: null,
  readiness: null,
  findings: [],
};

report.routes = await Promise.all(options.paths.map((path) => checkRoute(options.baseUrl, path)));
for (const route of report.routes) {
  if (!route.ok) {
    report.findings.push(`${route.path} returned ${route.status ?? route.error}`);
  }
}

if (!options.skipVercel) {
  report.vercel = await inspectVercelAlias(options.baseUrl, options.expectedDeployment);
  if (!report.vercel.ok) {
    report.findings.push(
      `Vercel alias ${report.vercel.hostname} points to ${report.vercel.deploymentId ?? "unknown"}, expected ${options.expectedDeployment || "a ready deployment"}`,
    );
  }
}

if (!options.skipReadiness) {
  report.readiness = await runReadinessAudit();
  if (!report.readiness.ok) {
    report.findings.push("Production readiness audit failed or returned findings.");
  }
}

report.ok = report.findings.length === 0;

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(summarize(report));
}

process.exit(report.ok ? 0 : 1);

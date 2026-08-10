#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sendTelegramAlert } from "./telegram-alert.mjs";
import { safeErrorSummary } from "./image-pipeline-lib.mjs";
import { alertPublicImageGapOnce, alertZeroPublishOnce, getDailyPublicationHealth } from "./newsroom-health.mjs";

const CODEX_TIMEOUT_MS = 45 * 60 * 1_000;
const LOGIN_TIMEOUT_MS = 60_000;
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : 4;
process.loadEnvFile?.(resolve(".env.local"));

function run(command, args, { timeoutMs, capture = false, env = process.env } = {}) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    });
    if (capture) child.stdout.on("data", (chunk) => chunks.push(chunk));
    let forceTimer;
    const timer = timeoutMs ? setTimeout(() => {
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 5_000);
    }, timeoutMs) : undefined;
    child.on("error", reject);
    child.on("exit", (code) => {
      if (timer) clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolvePromise({ code: code ?? 1, stdout: Buffer.concat(chunks).toString("utf8") });
    });
  });
}

async function listMissing(requestedLimit, { claim = false } = {}) {
  const args = ["scripts/list-missing-images.mjs", "--limit", String(requestedLimit)];
  if (claim) args.push('--claim');
  const result = await run(process.execPath, args, {
    timeoutMs: 60_000,
    capture: true,
  });
  if (result.code !== 0) throw new Error("IMAGE_BACKFILL_DATABASE_PREFLIGHT_FAILED");
  return JSON.parse(result.stdout);
}

async function main() {
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error("INVALID_IMAGE_BACKFILL_LIMIT");
  const publishingHealth = await getDailyPublicationHealth();
  const zeroPublishAlert = await alertZeroPublishOnce(publishingHealth);
  const publicImageAlert = await alertPublicImageGapOnce(publishingHealth);
  const manifest = await listMissing(limit, { claim: true });
  if (manifest.totalMissing === 0) {
    process.stdout.write(`${JSON.stringify({ ok: true, noOp: true, totalMissing: 0, publishingHealth, zeroPublishAlert, publicImageAlert })}\n`);
    return;
  }
  if (manifest.selected.length === 0) {
    process.stdout.write(`${JSON.stringify({ ok: true, noOp: true, totalMissing: manifest.totalMissing, claimed: 0, publishingHealth, zeroPublishAlert, publicImageAlert })}\n`);
    return;
  }

  const runId = new Date().toISOString().replaceAll(":", "-");
  const runDirectory = resolve("var", "cren-images", "runs", runId);
  await mkdir(runDirectory, { recursive: true });
  const manifestPath = resolve(runDirectory, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

  const subscriptionEnv = { ...process.env };
  delete subscriptionEnv.OPENAI_API_KEY;
  delete subscriptionEnv.CODEX_API_KEY;
  const login = await run("codex", ["login", "status"], { timeoutMs: LOGIN_TIMEOUT_MS, env: subscriptionEnv });
  if (login.code !== 0) throw new Error("CODEX_SUBSCRIPTION_AUTH_UNAVAILABLE");

  const instructions = await readFile(resolve("prompts", "IMAGE_BACKFILL.md"), "utf8");
  const prompt = `${instructions}\n\nRun manifest: ${manifestPath}\nProcess only the articles in this manifest.`;
  const agent = await run("codex", [
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--sandbox",
    "danger-full-access",
    "-C",
    process.cwd(),
    prompt,
  ], { timeoutMs: CODEX_TIMEOUT_MS, env: subscriptionEnv });
  if (agent.code !== 0) throw new Error(`CODEX_IMAGE_AGENT_EXIT_${agent.code}`);

  const remaining = await listMissing(20);
  const remainingIds = new Set(remaining.missingIds);
  const completed = manifest.selected.filter((article) => !remainingIds.has(article.id));
  const failed = manifest.selected.filter((article) => remainingIds.has(article.id));
  const status = failed.length === 0 ? "COMPLETED" : completed.length > 0 ? "PARTIAL_SUCCESS" : "FAILED";
  const telegram = await sendTelegramAlert({
    status,
    summary: `${completed.length} image(s) attached; ${failed.length} selected article(s) still need an image; ${remaining.totalMissing} missing overall.`,
    articles: completed,
  });
  process.stdout.write(`${JSON.stringify({ ok: status !== "FAILED", status, completed: completed.length, failed: failed.length, remaining: remaining.totalMissing, publishingHealth, zeroPublishAlert, publicImageAlert, telegram })}\n`);
  if (status === "FAILED") process.exitCode = 1;
}

main().catch(async (error) => {
  const reason = safeErrorSummary(error);
  const telegram = await sendTelegramAlert({ status: "FAILED", summary: reason });
  process.stderr.write(`${JSON.stringify({ ok: false, event: "cren_image_backfill_failed", reason, telegram })}\n`);
  process.exitCode = 1;
});

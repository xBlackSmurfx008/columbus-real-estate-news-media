// Run an existing repository script as a sub-check.
//
// The suite deliberately *invokes* the scripts that already own a rule rather
// than reimplementing them: scripts/verify-market-consistency.mjs owns market
// drift, scripts/production-readiness-audit.mjs owns data-layer readiness. A
// second copy of a rule is a second thing to keep in sync, and the whole point
// of this pass is that a rule has one home.

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { redact } from "./db.mjs";

export const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runNode(args, { env = process.env, timeoutMs = 180_000 } = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, args, {
      cwd: FRONTEND_ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolveRun({ ok: false, code: null, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolveRun({ ok: code === 0, code, stdout: redact(stdout), stderr: redact(stderr) });
    });
  });
}

/** Last N non-empty output lines, for a compact finding. */
export function tail(text, lines = 12) {
  return String(text)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-lines);
}

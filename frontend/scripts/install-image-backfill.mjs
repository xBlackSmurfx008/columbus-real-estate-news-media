#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { buildImageBackfillPlist, IMAGE_BACKFILL_TIMES } from "./image-launch-agent-lib.mjs";

const frontendPath = process.cwd();
const codexResult = spawnSync("/usr/bin/which", ["codex"], { encoding: "utf8" });
const codexPath = codexResult.stdout.trim();
if (codexResult.status !== 0 || !codexPath) throw new Error("CODEX_CLI_NOT_FOUND");
await mkdir(resolve(frontendPath, "var", "cren-images"), { recursive: true });
const launchDirectory = resolve(homedir(), "Library", "LaunchAgents");
await mkdir(launchDirectory, { recursive: true });
const plistPath = resolve(launchDirectory, "com.cren.image-backfill.plist");
await writeFile(plistPath, buildImageBackfillPlist({
  frontendPath,
  nodePath: process.execPath,
  codexBinPath: dirname(codexPath),
}), { mode: 0o600 });
await chmod(plistPath, 0o600);

const domain = `gui/${process.getuid()}`;
spawnSync("/bin/launchctl", ["bootout", domain, plistPath]);
const bootstrap = spawnSync("/bin/launchctl", ["bootstrap", domain, plistPath], { encoding: "utf8" });
if (bootstrap.status !== 0) throw new Error(bootstrap.stderr.trim() || "LAUNCH_AGENT_BOOTSTRAP_FAILED");
spawnSync("/bin/launchctl", ["enable", `${domain}/com.cren.image-backfill`]);
process.stdout.write(`${JSON.stringify({ installed: true, plistPath, attempts: IMAGE_BACKFILL_TIMES })}\n`);

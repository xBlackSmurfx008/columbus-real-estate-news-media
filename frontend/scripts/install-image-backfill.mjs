#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmod, mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { buildImageBackfillPlist, IMAGE_BACKFILL_TIMES } from "./image-launch-agent-lib.mjs";

const frontendPath = process.cwd();
const apply = process.argv.includes('--apply');
if (apply && !process.argv.includes('--confirm=install-cren-image-worker')) throw new Error('INSTALL_CONFIRMATION_REQUIRED');
const envFilePath = resolve(process.env.CREN_IMAGE_ENV_FILE ?? '.env.local');
const envStat = await stat(envFilePath);
if (!envStat.isFile() || (envStat.mode & 0o077) !== 0) throw new Error('PRIVATE_ENV_FILE_REQUIRED');
const codexResult = spawnSync("/usr/bin/which", ["codex"], { encoding: "utf8" });
const codexPath = codexResult.stdout.trim();
if (codexResult.status !== 0 || !codexPath) throw new Error("CODEX_CLI_NOT_FOUND");
const launchDirectory = resolve(homedir(), "Library", "LaunchAgents");
const plistPath = resolve(launchDirectory, "com.cren.image-backfill.plist");
const plist = buildImageBackfillPlist({
  frontendPath,
  nodePath: process.execPath,
  codexBinPath: dirname(codexPath),
  envFilePath,
});
if (!apply) {
  console.log(JSON.stringify({ dryRun: true, frontendPath, envFilePath, plistPath, attempts: IMAGE_BACKFILL_TIMES }));
  process.exit(0);
}
await mkdir(resolve(frontendPath, 'var', 'cren-images'), { recursive: true });
await mkdir(launchDirectory, { recursive: true });
let backupPath;
try {
  const previous = await readFile(plistPath);
  backupPath = resolve(frontendPath, 'var', 'cren-images', `launchagent-backup-${Date.now()}.plist`);
  await writeFile(backupPath, previous, { mode: 0o600, flag: 'wx' });
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await writeFile(plistPath, plist, { mode: 0o600 });
await chmod(plistPath, 0o600);

const domain = `gui/${process.getuid()}`;
const service = `${domain}/com.cren.image-backfill`;
spawnSync("/bin/launchctl", ["bootout", service]);
spawnSync("/bin/launchctl", ["enable", service]);
let bootstrap;
for (let attempt = 1; attempt <= 3; attempt += 1) {
  bootstrap = spawnSync("/bin/launchctl", ["bootstrap", domain, plistPath], { encoding: "utf8" });
  if (bootstrap.status === 0) break;
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250 * attempt));
}
if (bootstrap?.status !== 0) throw new Error(bootstrap?.stderr.trim() || "LAUNCH_AGENT_BOOTSTRAP_FAILED");
process.stdout.write(`${JSON.stringify({ installed: true, plistPath, backupPath, attempts: IMAGE_BACKFILL_TIMES })}\n`);

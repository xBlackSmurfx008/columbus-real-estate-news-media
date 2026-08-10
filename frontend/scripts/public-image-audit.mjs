#!/usr/bin/env node
import { getDailyPublicationHealth } from './newsroom-health.mjs';

process.loadEnvFile?.('.env.local');

try {
  const health = await getDailyPublicationHealth();
  const result = {
    ok: health.publicImagesMissing === 0,
    publicImagesMissing: health.publicImagesMissing,
    articles: health.publicImageGaps,
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.ok) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`);
  process.exitCode = 1;
}

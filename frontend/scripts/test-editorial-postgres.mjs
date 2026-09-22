#!/usr/bin/env node
// Starts an isolated temporary PostgreSQL cluster; never reads DATABASE_URL.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

const run = promisify(execFile);
const choices = [process.env.CREN_TEST_PG_BIN, '/opt/homebrew/opt/postgresql@18/bin', '/opt/homebrew/opt/postgresql@17/bin', '/usr/lib/postgresql/18/bin', '/usr/lib/postgresql/17/bin', '/usr/lib/postgresql/16/bin'].filter(Boolean);
let binaries;
for (const choice of choices) {
  try { await access(join(choice, 'initdb')); await access(join(choice, 'pg_ctl')); binaries = choice; break; } catch { /* next */ }
}
if (!binaries) throw new Error('POSTGRES_TEST_BINARIES_REQUIRED: set CREN_TEST_PG_BIN to a local PostgreSQL bin directory');
const directory = await mkdtemp(join(tmpdir(), 'cren-editorial-pg-'));
const data = join(directory, 'data');
const server = createServer();
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const database = `cren_editorial_test_${process.pid}`;
const childEnv = { ...process.env, PATH: `${binaries}:${process.env.PATH}` };
delete childEnv.DATABASE_URL;
let started = false;
try {
  await run(join(binaries, 'initdb'), ['-D', data, '--auth=trust', '--no-locale', '--encoding=UTF8'], { env: childEnv });
  await run(join(binaries, 'pg_ctl'), ['-D', data, '-l', join(directory, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -k ${directory}`, '-w', 'start'], { env: childEnv });
  started = true;
  await run(join(binaries, 'createdb'), ['-h', '127.0.0.1', '-p', String(port), database], { env: childEnv });
  childEnv.CREN_TEST_DATABASE_URL = `postgresql://127.0.0.1:${port}/${database}`;
  const result = await run(process.execPath, ['--experimental-strip-types', '--test', 'tests/editorial-workflow-postgres.test.ts'], {
    cwd: new URL('../', import.meta.url), env: childEnv, maxBuffer: 5_000_000,
  });
  process.stdout.write(result.stdout); process.stderr.write(result.stderr);
} catch (error) {
  if (error.stdout) process.stdout.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  process.exitCode = 1;
  console.error(error.message);
} finally {
  if (started) await run(join(binaries, 'pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop'], { env: childEnv });
  console.log(`Isolated PostgreSQL stopped; local test files retained at ${directory}`);
}

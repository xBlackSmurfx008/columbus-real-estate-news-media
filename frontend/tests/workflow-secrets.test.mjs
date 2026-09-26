import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

// A pull_request run executes the workflow file from the PR branch, so any job
// it can reach must not hold a production secret. Jobs that do need one run in
// the `reporting` environment, which the owner restricts to the main branch.
const dir = new URL('../../.github/workflows/', import.meta.url);
const workflows = readdirSync(dir)
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => ({ name, text: readFileSync(new URL(name, dir), 'utf8') }));

function jobs(text) {
  const body = text.split(/^jobs:\s*$/m)[1] ?? '';
  return body.split(/^(?= {2}[A-Za-z0-9_-]+:\s*$)/m).filter((chunk) => /^ {2}[A-Za-z0-9_-]+:/.test(chunk))
    .map((chunk) => ({ id: chunk.match(/^ {2}([A-Za-z0-9_-]+):/)[1], text: chunk }));
}

const secretRefs = (text) => [...text.matchAll(/secrets\.([A-Za-z0-9_]+)/g)].map((match) => match[1]).filter((name) => name !== 'GITHUB_TOKEN');

test('no job reachable from a pull_request trigger references a secret', () => {
  for (const { name, text } of workflows) {
    const onBlock = text.split(/^jobs:\s*$/m)[0];
    if (!/^\s*pull_request(_target)?:/m.test(onBlock)) continue;
    assert.doesNotMatch(onBlock, /pull_request_target/, `${name} must not use pull_request_target`);
    for (const job of jobs(text)) {
      const excludesPullRequests = /^ {4}if: github\.event_name != 'pull_request'\s*$/m.test(job.text);
      if (excludesPullRequests) continue;
      assert.deepEqual(secretRefs(job.text), [], `${name} job ${job.id} runs on pull requests and references secrets`);
    }
  }
});

test('every job that references a secret runs in the reporting environment', () => {
  for (const { name, text } of workflows) {
    for (const job of jobs(text)) {
      if (secretRefs(job.text).length === 0) continue;
      assert.match(job.text, /^ {4}environment: reporting\s*$/m, `${name} job ${job.id} must declare environment: reporting`);
    }
  }
});

#!/usr/bin/env node
// Read-only source-choice preflight. Does not generate, fetch, upload or attach anything.
import { readFile } from 'node:fs/promises';
import { planEditorialImage } from './editorial-image-policy.mjs';
import { buildHeroPrompt } from './image-pipeline-lib.mjs';
const index = process.argv.indexOf('--review');
if (index < 0 || !process.argv[index + 1]) throw new Error('REVIEW_FILE_REQUIRED');
const review = JSON.parse(await readFile(process.argv[index + 1], 'utf8'));
const acquisition = planEditorialImage(review);
console.log(JSON.stringify({ acquisition, imagePrompt: acquisition.mode === 'AI_FALLBACK' ? buildHeroPrompt(review) : null }, null, 2));
if (acquisition.mode === 'NEEDS_RESEARCH') process.exitCode = 1;

import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateArticle } from '../scripts/editorial-quality-lib.mjs';

const answerSummary = 'A Columbus housing permit entered early city review this week. The filing matters because it shows how a vacant commercial site could change, while key design, approval, cost, and construction questions remain open.';
const contextParagraph = 'City records give readers a useful starting point, but they do not settle the project’s final shape. The review can change after staff comments, public meetings, engineering work, or a new submission. CREN should explain that process in everyday language, name the record being used, and separate the applicant’s stated goal from what the city has decided. That distinction gives nearby residents, property owners, and civic watchers a clear account without pretending an early filing is a finished plan.';
const body = [
  answerSummary,
  '## What did the city receive?',
  'City staff described the filing as an early review step. The record identifies the applicant, the site, and the broad use under discussion. It does not provide final architecture or a guaranteed construction schedule. This section should link directly to the record and explain which facts come from the applicant, which come from city staff, and which remain unknown. Readers can then understand the news without being pushed toward a sales or investment conclusion.',
  '## Why does the filing matter locally?',
  contextParagraph,
  'The local value comes from the site’s relationship to nearby homes, streets, transit, and existing businesses. A useful article describes those relationships with verified geography and explains the likely public process. It avoids generic claims that more development automatically helps or harms the market. It also avoids guessing about rents, returns, traffic, or completion dates when the record does not answer those questions.',
  '## What remains unresolved?',
  contextParagraph,
  'Readers should watch for a revised plan, a dated staff recommendation, and any scheduled public meeting. Those events would change the project’s documented status and justify a follow-up article. Until then, CREN should call the proposal what it is: an early filing under review. That ending gives the reader a precise next checkpoint instead of a vague prediction or promotional call to action.',
].join('\n\n');

function validArticle() {
  return {
    title: 'Columbus Housing Permit Enters Early City Review',
    category: 'Development',
    author: 'CREN Newsroom',
    date: 'Aug 10, 2026',
    excerpt: 'A Columbus housing permit entered early review, offering a first look at a possible site change while design, timing, and approval remain unresolved.',
    body,
    answer_summary: answerSummary,
    primary_keyword: 'Columbus housing permit',
    meta_description: 'A Columbus housing permit entered early city review, showing a possible site change while design, approval, cost, and timing remain unresolved.',
    fact_checked_at: '2026-08-10T10:00:00-04:00',
    canonical_event_key: 'city-permit-example-2026-08-10',
    location: { name: 'Columbus', state: 'OH' },
    source_ledger: [
      { id: 'S1', type: 'PRIMARY', url: 'https://www.columbus.gov/example', publisher: 'City of Columbus', title: 'Application record', fetched_at: '2026-08-10T09:00:00-04:00', http_status: 200 },
      { id: 'S2', type: 'SECONDARY', url: 'https://news.wosu.org/example', publisher: 'WOSU', title: 'Local context', fetched_at: '2026-08-10T09:05:00-04:00', http_status: 200 },
    ],
    claim_ledger: [
      { id: 'C1', claim: 'City staff described the filing as an early review step.', source_ids: ['S1'] },
    ],
    entity_ledger: [
      { name: 'City of Columbus', source_ids: ['S1'] },
    ],
    image_brief: {
      primary_request: 'Explain an early site-review process without inventing a finished building.',
      editorial_idea: 'Contrast an existing commercial parcel with layered review documents.',
      story_anchors: ['existing low-rise commercial parcel', 'stacked planning sheets without readable text'],
      source_asset_considered: true,
      avoid: 'finished-project rendering',
    },
    image_alt: 'Editorial illustration of a Columbus commercial parcel beside layered planning sheets.',
    image_provenance: { type: 'AI_GENERATED', caption: 'AI-generated illustration for CREN.' },
  };
}

test('complete, sourced draft passes the deterministic gate but still requires a human', () => {
  const report = evaluateArticle(validArticle());
  assert.equal(report.passed, true, report.failedCodes.join(','));
  assert.equal(report.humanReviewRequired, true);
});

test('generic promotional HTML copy is blocked before it reaches the draft queue', () => {
  const article = validArticle();
  article.body = `<p>${answerSummary}</p><p>Our team tracks these moves for investors. Start at deploy capital.</p>`;
  const report = evaluateArticle(article);
  assert.equal(report.passed, false);
  assert.ok(report.failedCodes.includes('A11_FAIR_BALANCE'));
  assert.ok(report.failedCodes.includes('A14_WEB_STRUCTURE'));
});

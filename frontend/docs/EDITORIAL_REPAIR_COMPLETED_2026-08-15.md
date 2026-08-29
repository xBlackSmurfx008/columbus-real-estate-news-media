# CREN Editorial Repair — Completed

Status: **Completed and published**  
Completion date: **August 15, 2026 (America/New_York)**  
Writing-system version: **`cren-article-v1.0.0`**

> Operational update (August 24, 2026): the owner explicitly replaced the future human-approval queue with fail-closed
> automatic publication. The historical repair described below still records its original approvals. Current drafts go
> live automatically only after the exact copy passes all 18 checks and the final image is reachable, fingerprinted, and unique.

> Current status (August 28, 2026): the historical 73-article repair remains complete. Production now has 87 live
> articles; uptime passes and the public image audit reports 87/87 live images reachable with no missing or broken
> images. The remaining readiness reconciliation is one missing canonical slug, six missing image fingerprints/jobs,
> 13 live rows with queued review statuses, and the uninstalled market-observation layer. Current deployed code is
> `3fc9ba8` on `feat/site-map`.

## Final result

- All **73 live CREN articles** were rebuilt, re-reported, or recertified.
- All 73 passed the deterministic editorial gate at **18/18**.
- The owner approved the complete set; all 73 review jobs record **20/20 human approval**.
- All 73 corrected submissions were published to the live article records.
- The public CREN API was checked after publication and returned all 73 corrected live articles.
- All 73 hero images were reachable and durable, with **zero duplicate-image groups**.
- A private pre-publication database snapshot was saved at:
  `var/article-revisions/pre-publish-backups/articles-2026-08-16T00-45-08.035Z.json`
- Tests passed: **28/28**.
- The production Next.js build completed successfully.
- The personal Codex skill `cren-editorial-maintenance` was installed at
  `/Users/mr.adams/.codex/skills/cren-editorial-maintenance` so future sessions can reuse this workflow.

## What was fixed

The old corpus contained thin or source-less stubs, unsupported market implications, expired event framing, incorrect project statuses, misleading arithmetic, raw citation artifacts, promotional language, and claims that were not tied to reader-visible evidence.

Important factual corrections included:

- COTA Line 30 serves Hilliard, not Dublin.
- The current North Market tower program lists 142 residences, not 174.
- Harvest Clintonville reopened in November 2024, not after a new 2026 fire.
- Zone In's 88,000 figure is zoning capacity, not homes already approved or built.
- The $500 million housing bond is authorization across several housing programs, not money already spent.
- The WestRich official count is 234 units, not 235.
- Bishop Elementary opened in 2025, not 2026.
- The Canal Winchester industrial project's 400 jobs are a developer forecast, not current hiring.
- Several events and development announcements no longer claim unmeasured effects on home prices, rents, foot traffic, or neighborhood demand.

## Permanent process improvements

The repair added or strengthened:

- `prompts/ARTICLE_WRITING.md`: the versioned CREN reporting and writing standard.
- `docs/article-submission.schema.json`: structured article, source, claim, entity, and image requirements.
- `docs/EDITORIAL_GATE.md`: deterministic and human-review publication requirements.
- `scripts/editorial-quality-lib.mjs`: the 18-check machine gate.
- `app/api/admin/articles/[id]/route.ts`: exact-candidate revalidation before publication.
- `app/api/admin/articles/route.ts` and the admin article editor: load and display the queued corrected submission.
- `lib/db.ts`: source-less seed stubs default to draft rather than live.
- `scripts/article-revision-manifest.mjs`: inventory and classify the corpus.
- `scripts/article-revision-coverage.mjs`: verify every manifest article has a revision artifact.
- `scripts/verify-article-revision-queue.mjs`: pre-publication verification of queued revisions.
- `scripts/publish-approved-revisions.mjs`: guarded batch publication with exact-copy validation, image fingerprinting, review recording, and a private rollback snapshot.

## Required workflow for future article fixes

Run commands from `frontend/`.

1. Audit the current public images before editing:

   ```bash
   npm run newsroom:audit-public-images
   ```

2. Refresh the article manifest when the live corpus changes:

   ```bash
   node --env-file=.env.local scripts/article-revision-manifest.mjs --write
   ```

3. Build a revision against `prompts/ARTICLE_WRITING.md`. Do not edit the live row directly.

4. Run the batch locally with `--write`. Every article must pass 18/18 before staging.

5. Stage the passing candidate with its batch script's `--stage` flag. Staging must write to `editorial_review_jobs`, not publish the article.

6. Verify artifact coverage and the pending review queue:

   ```bash
   node scripts/article-revision-coverage.mjs
   node --env-file=.env.local scripts/verify-article-revision-queue.mjs
   ```

7. Let the cloud newsroom attach the final image and revalidate the exact article-image pair. Passing work publishes
   immediately; failed work remains a draft with a machine-readable error.

8. Verify the live public API, rerun the public-image audit, tests, build, and `git diff --check`.

## Publication safeguards that must not be bypassed

- Do not publish source-less stubs.
- Do not use private ledgers as a substitute for reader-visible source links.
- Do not publish raw tokens such as `[S1]`, `Source 1`, or prompt notes.
- Do not convert proposals, approvals, forecasts, marketing claims, or tax-credit awards into completed outcomes.
- Do not infer home-price, rent, demand, traffic, employment, or economic effects without direct evidence.
- Do not reuse an article image, even through a different URL; compare image fingerprints.
- Do not publish a changed draft against an earlier machine report.
- Do not bypass the exact-copy, source, image reachability, fingerprint, or duplicate-image checks.

## Future fixes and maintenance priorities

### Priority 0 — production reconciliation for stable article URLs

The immutable `canonical_slug` column, redirect table, canonical routing, and redirect recovery are implemented. Production
still has one live article without a populated canonical slug; repair that row and rerun the readiness audit before the
next large headline rewrite.

### Priority 1 — editorial review history

`editorial_review_jobs` currently keeps the latest review per article. Add an append-only review-history table containing the content hash, prompt version, machine report, human scores, reviewer, decision, and publication timestamp.

### Priority 1 — transactional batch publication

The guarded publisher validates the complete set before writing and uses an atomic SQL statement per article. A network failure could still stop a future batch between articles. Add a server-side database transaction or a resumable publication-run table for large batches.

### Priority 1 — restore tooling

The private backup contains the prior rows, but restoration is intentionally manual. Add a dry-run restore script that verifies the backup schema and requires explicit article IDs and confirmation before changing production.

### Priority 2 — independent-source depth

The gate requires reader-visible evidence, but some local stories necessarily rely heavily on first-party records. Continue replacing aggregator or promotional sources with ordinances, agendas, deeds, permits, audited market data, and independent local reporting as those records become available.

### Priority 2 — known build warnings

- Migrate the deprecated Next.js `middleware` convention to `proxy`.
- Scope or remove dynamic filesystem access in `src/agent/store.ts`; Turbopack currently warns that it traces the whole project.
- Decide whether to set the package module type to remove Node's typeless-module test warnings.
- Configure `turbopack.root` so Next.js does not inspect the unrelated parent lockfile.

### Routine cadence

- Run the image and newsroom health audits daily.
- Review developing stories when an approval, construction start, opening, sale, or official dataset changes their status.
- Recheck event articles immediately after the event date so future-tense copy does not remain live.
- Re-audit market articles monthly and never combine incompatible providers, geographies, windows, or methodologies without explaining the difference.
- Increment the writing prompt version whenever its standards materially change, and require that version in every new submission.

## Recovery note

The backup file is private and gitignored. Do not publish, email, or commit it. Before any rollback, compare the backup timestamp with later legitimate edits so a restoration does not overwrite newer work.

# CREN cloud-only handoff

Owner direction, September 22: keep the handoff fully cloud-hosted; no Mac dependency, no separate image approval.
Email approval of the exact complete package remains final. Paid email revisions remain off.

## Design and authority

Repair authority covers code, bounded draft ingestion, schedule configuration and verified deployment. It does not
authorize new paid models, blanket backlog publication, outreach, secret exposure or weakened editorial gates.
The repository is public. Vercel can read immutable GitHub data without a GitHub token or Actions runner. Existing
DATABASE_URL stays in Vercel's secure runtime; never place it in Claude's ordinary environment-variable field.

Flow: active Claude cloud writer -> public main article JSON and optional reviewed source-image bytes -> protected
Vercel importer -> atomic non-public article/review/import receipt -> cloud photo attachment -> existing proof cron ->
owner email approval -> exact-artifact publication. Imported repository content is data, never executable code.

## Invariants and acceptance

- Fixed repository/branch/path; immutable commit/blob identifiers, bounded bytes/count/time and today's Eastern date.
- Default helper is read-only; runtime writes require an explicit flag and authenticated Vercel cron.
- Article/review/receipt stage atomically. Replay returns the stored receipt; conflicting paths/IDs/content and duplicates
  remain non-public. No FORCE, current-live update, paid model, mail send or automatic old-backlog import.
- Current writing/image policy required. Structural validation is not a factual or rights certification.
- Cloud source images require exact-byte review, rights/context/credit and immutable repository asset binding; decode,
  normalize, fingerprint and atomically attach using the existing gate. Missing evidence is a durable hold.
- No additional paid generation is enabled. Existing local image service must not race new cloud-only candidates.
- Production verification distinguishes authenticated invocation, actual durable receipt, image attachment and mail
  delivery. An empty queue or HTTP200 alone does not prove a complete new-article cycle.

## Slices

1. Public GitHub reader and atomic draft importer; malformed/stale/replay/conflict/concurrency tests.
2. Reviewed source-image cloud path; byte mismatch, unsafe path, missing rights, stale snapshot and duplicate tests.
3. Authenticated scheduled route, secure configuration helper and writer instructions; unit/type/lint/cloud-build checks.
4. Read-only live preflight, additive migration, flag activation/deployment and provider-triggered receipt verification.
   Do not publish a canary or fabricate evidence. Preserve existing105live articles and report any real content hold.

Recovery: disable import flag/revert deployment; retain additive receipts and non-public drafts. Do not delete live data.
Run history and final checks belong in root NOTES.md and the supervised handoff document.

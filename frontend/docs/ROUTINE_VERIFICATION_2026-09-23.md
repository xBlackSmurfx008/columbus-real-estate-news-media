# CREN routine verification — September 23, 2026

Operator observations, not permanent health guarantees. Earlier daily briefs describing direct database writes,
Higgsfield dependency and blanket publication failure are historical and must not be used as current health evidence.

## Verified at 08:25 UTC

- All four live Claude routine instruction bodies were saved and independently read back against repository prompts.
- Existing cadence remains daily newsroom 06:33 Eastern, daily listener 16:43 Eastern, Sunday SEO 10:00 Eastern,
  and first-of-month operating review 10:00 Eastern. Provider start times may be staggered.
- Vercel configuration readback: cloud import enabled, cloud image/proof processing enabled, paid AI images disabled.
- Read-only database snapshot: last audited publication `2026-09-22T15:13:38.784353Z`; one draft, held for
  `REAL_PHOTO_RESEARCH_REQUIRED`; zero pending proof, correction or publication jobs and zero expired leases.
- Last hosted import attempt `2026-09-23T08:05:18.565698Z`, result `NO_ARTIFACTS`.
- September 22's legacy Dublin GitHub package remains held for `IMPORT_CURRENT_WRITING_POLICY_REQUIRED`.
- A legacy article without an email-review row is not evidence of unauthorized publication; the email gate did not
  exist for all historical content. Editorial dates are not audited publication timestamps.

## Canary review

Social and weekly SEO canaries delivered exact one-report pull requests to `main` (PRs 21 and 20). Their first
outputs failed editorial review: social admitted snippet-only/undated leads and inferred sentiment; SEO repeated
obsolete operational claims. Corrections were requested in both cloud sessions, and the saved prompt policy was
tightened to require zero verified leads on snippet-only access and fresh evidence for operational claims.
Do not treat initial canary completion status as editorial acceptance. Final corrected artifacts must be read back.

Newsroom reads social/SEO reports as untrusted assignment suggestions, never as factual evidence. Only the owner's
verified email approval releases an unchanged article/image package. Paid email revisions remain off.

## Research environment repair — 09:04 UTC

The first newsroom canary completed with a truthful no-story receipt on GitHub `main` (PR 26). Its direct source
requests and photo downloads were blocked by the Default environment's Trusted network policy. This is an
environment/configuration failure, not evidence that local news did not exist.

Created a dedicated `CREN public research` environment with Full network access, empty environment variables and
no setup script. Assigned exactly the four CREN routines and independently reloaded each setting. Other routines,
Default environment, schedules, connectors and instruction bodies were unchanged. A new newsroom run was started
at 05:04 Eastern to test the new environment; earlier sessions cannot establish whether the change works.

At 09:05 UTC, the hosted importer independently recorded its scheduled attempt and recognized today's quiet run
(health last-run age 0.1 hours). The pre-existing Dublin content/image holds remain; no hold was bypassed.

### Reusable attended configuration

`node scripts/configure-claude-research-environment.mjs --window=ID --tab=ID --routine=newsroom`
opens the exact allowlisted routine in the specified Chrome tab, reads its environment, and closes the dialog.
Routine keys: `newsroom`, `social`, `weekly`, `monthly`. To assign the already-created environment after approval,
add `--apply --confirm=environment-<exact-routine-name>`. The helper preserves instructions/schedules, waits for save,
reloads and independently verifies the stored assignment. It never creates environments or transfers credentials.

## Fresh-run observations — 09:10 UTC

Fresh cloud session `session_01Vc3QcsFVGwGed8bzCn9AdZ` is using the dedicated research environment. It successfully
fetched Columbus government content and downloaded/read the official Downtown Commission schedule PDF. It reported
Wikimedia access working after identifying a malformed thumbnail URL; an accepted article/photo package and proof
are not yet established by these access checks. Some publisher requests still return domain-specific 403/429 errors.
The environment itself was independently reopened and confirmed Full, with both environment/setup fields empty.

The weekly report received a second evidence correction: removed unsupported readiness/demand/sentiment claims,
recomputed metadata counts and removed demonstrably false coverage-gap claims. Its prompt now requires an explicit
final evidence audit; live saved/reloaded instruction hash matches `.claude/routines.md`. Twenty-five focused
routine/import/source contract tests pass. Syntax and diff checks pass for the attended environment helper.

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

## Final bounded verification — 09:14 UTC

- Repair PR 27 merged as `a5cb4d2`; corrected SEO report on `main` exactly matches the reviewed local SHA-256
  `bf2dac48f5848c8ccd3ae5e9107fdefeeeb471649a6e38fef835559146c71913`.
- Fresh newsroom canary delivered receipt-only PR 28, merged as `08bbf47`. It truthfully returns
  `NO_QUALIFYING_STORY` / `NEEDS_REPORTING` / `NEEDS_IMAGE`; no article was generated or published. The official
  schedule ultimately confirmed the September 22 hearing date, but no reachable decision record was found.
  Its description "second scheduled run" is inaccurate: this was an operator-triggered manual canary.
- 09:11:34–09:11:48 UTC independent check: apex/www homepages and public APIs returned HTTP 200, both APIs exposed
  105 articles. The public API may serve a snapshot fallback; this is availability evidence, not database proof.
- `configure-cloud-handoff.mjs` dry run returned `configurationMatches: true`: production import, cloud image and
  proof processing enabled; paid corrections/generation and protected outbound/acquisition flags disabled.
- No runtime application change or deployment was needed for this environment/prompt repair. No credentials were
  transferred and no article, image, approval, historical hold or unrelated routine was changed.

Remaining limits: publisher-specific access restrictions, the existing Dublin image/content-policy holds, and no
new qualifying article/photo package in the canary. The second SEO correction is verified on GitHub but its Drive
mirror is not yet verified; the old Claude session stalled loading during the mirror check. Do not claim the Drive
copy is synchronized or that this no-story canary exercised proof delivery/approval/publication. The hourly importer
recognized the earlier quiet receipt at 09:05; consumption of the later PR 28 receipt remains to be checked at its
next scheduled cycle. GitHub-hosted checks also retain the previously observed account billing/runner limitation;
the local 25-test pass does not imply remote CI executed.

# Site quality gates (product layer)

Owner plan 2026-09-04, item 12. The newsroom is already fail-closed at the
editorial layer: `scripts/publish-article.mjs` refuses to publish an article
that does not pass a deterministic gate. This is the same posture for the
product — one command that decides whether the site is fit to deploy.

```bash
cd frontend
npm run verify:site                       # production, read-only
npm run verify:site -- --target local     # a local `next start` build
npm run verify:site -- --help             # every flag
```

Exit code `0` means no blocking check failed. Exit code `1` means it did.
That is the whole contract, so the command can sit in front of a deploy.

## The three states, and why SKIPPED is not a pass

| State | Meaning |
|---|---|
| `PASS` | The check ran end to end and found nothing wrong. |
| `FAIL [BLOCKING]` | A defect that stops a deploy. Exit code 1. |
| `FAIL [advisory]` | A real defect that does not stop a deploy. Printed, never suppressed. |
| `SKIP` | The check **could not run** — no credentials, no network path, nothing on the target to assert against. It verified nothing. |
| `ERROR` | The check itself threw. Always blocking. |

Every `SKIP` prints its reason twice: inline, and again in a block at the end of
the report headed *"SKIPPED checks verified nothing. They are not passes."*

This is not decoration. A scheduled uptime workflow on this repository failed 34
consecutive runs at the infrastructure level and nobody knew, because a check
that never ran looks exactly like a check that passed. `--require-all` turns
every skip into a blocking failure when you need proof of full coverage.

## What is checked

| Check id | Blocking | What it asserts |
|---|---|---|
| `links` | yes | Every same-origin link on a sampled page resolves. |
| `links-external` | advisory | Outbound source links in articles resolve. **Off by default** — CLAUDE.md forbids hammering other outlets. `--external-links`. |
| `indexability` | yes | robots.txt, the sitemap and each page's meta robots agree. A sitemap URL that serves `noindex` is a contradiction. |
| `canonicals` | yes | Exactly one canonical per page, absolute, right host, and a cross-pointing canonical must resolve. Missing canonicals are advisory. |
| `metadata` | yes | No two indexable pages share a `<title>` or a meta description, and none is missing. Length outside CLAUDE.md's conventions (title 45–75, description 140–165) and a brand repeated inside one title are advisory. |
| `schema` | yes | Every `ld+json` block parses; article pages carry a valid `NewsArticle` and `BreadcrumbList`. The homepage must declare an `Organization` and a `WebSite`. Coverage gaps are advisory. |
| `disclosure-policy-pages` | yes | `/lead-disclosure`, `/editorial-standards`, `/privacy`, `/terms` resolve. |
| `disclosure-funnel` | yes | `components/funnel-disclosure.tsx` renders on all four funnel pages. |
| `disclosure-affiliate` | yes | `components/ftc-disclosure.tsx` renders **above** the first *paid* link (`rel="sponsored"`), by document position. `/go/*` alone is the outbound click tracker and carries unpaid links too, so it does not trigger the rule — demanding "some links below pay us" above an unpaid link would publish a false statement. |
| `lead-form-validation` | yes | All four form endpoints reject invalid input with HTTP 400. Writes nothing, so it is safe on production. |
| `lead-form-submission` | yes | A real submission lands, is flagged `is_test`, and is deleted. **Write path — see below.** |
| `analytics-mounted` | yes | The root layout still mounts `PageviewTracker` and `FunnelTracker`. |
| `analytics-flowing` | yes | `page_views` has recent rows. Empty `funnel_events` is advisory. |
| `analytics-writable` | yes | An event posted right now is stored with `is_test = true`, then removed. **Write path.** |
| `stats-consistency` | yes | Invokes `tests/market-data-consistency.test.mjs` **and** `scripts/verify-market-consistency.mjs`. |
| `stats-freshness` | yes | Market numbers are inside their refresh budget. Weekly series: 21d advisory / 60d hard. Monthly: 45d / 120d. |
| `stats-deployed` | yes | The **served** `/market-data` shows the canonical values — catches a stale ISR cache or an undeployed build. |
| `authors` | yes | Every live byline is approved by `scripts/newsroom-authors.mjs`, with no near-duplicate spellings. |
| `authors-rendered` | advisory | Sampled article pages render an approved byline. |
| `sources` | yes | No live article cites nothing. Below the A4 two-domain floor is advisory. |
| `images-policy` | yes | Every live hero is on a durable host, fingerprinted, and unique. |
| `images-reachable` | yes | Invokes `scripts/public-image-audit.mjs` (read-only, never `--fix`). |
| `images-rendered` | advisory | Every `<img>` on a sampled page resolves. |
| `data-readiness` | yes | Invokes `scripts/production-readiness-audit.mjs`; its errors block, its warnings are advisory. |
| `performance` | yes | Server response time and HTML size budgets. Hard ceilings block. |
| `performance-web-vitals` | advisory | **SKIPPED unless `--web-vitals`.** No browser here, so LCP/CLS/INP are not measured locally; the flag queries the PageSpeed Insights API instead. |

## Write-path safety

Two checks write. Both obey the same rules:

1. **Production is read-only by default.** With `--target production` (the
   default) both report `SKIPPED` with the reason. Use `--target local` against
   a built site, or pass `--allow-write` to opt in explicitly.
2. **Test traffic by construction.** Every payload is checked against
   `scripts/test-traffic-lib.mjs` *before it is sent*. If any payload would not
   be classified as test traffic, the check refuses to send anything at all.
3. **Cleaned up.** The rows are deleted after verification, including the
   `funnel_events` row `/api/leads` derives from a submission. If the database
   is unreachable and rows cannot be removed, the check FAILS and names the run
   id — it never reports success on data it left behind.

`lead-form-submission` extends `scripts/submission-smoke.mjs` rather than
posting its own payloads, so there is one definition of a controlled CREN
submission. See `docs/TEST_TRAFFIC_CONVENTION.md`.

## Relationship to the other audit scripts

This suite deliberately **invokes** the scripts that already own a rule instead
of restating it:

- `scripts/verify-market-consistency.mjs` + `tests/market-data-consistency.test.mjs` → `stats-consistency`
- `scripts/production-readiness-audit.mjs` → `data-readiness`
- `scripts/public-image-audit.mjs` → `images-reachable`
- `scripts/article-image-policy.mjs` → `images-policy` (imported)
- `scripts/newsroom-authors.mjs` → `authors` (imported)
- `scripts/submission-smoke.mjs` → `lead-form-*` (imported)
- `scripts/test-traffic-lib.mjs` → every write path (imported)
- `scripts/funnel-lib.mjs` → funnel identity everywhere (imported)

## What the build already guarantees, so the gate does not have to

`verify:site` inspects a *served* site, which means it can only find a metadata
defect after a deploy. The same rules are asserted against the source in
`tests/seo-metadata.test.mjs`, which runs in `npm run test:image-pipeline` and
fails the build instead:

- every static page builds its head through `lib/page-metadata.ts`, so a
  self-referencing absolute canonical is not something anyone can forget;
- the canonical path matches the route the file is actually served at;
- titles and meta descriptions are unique, inside the length conventions, and
  never repeat the brand the root layout template already appends;
- no page marked `noindex` appears in `app/sitemap.ts` — the `/saved`
  contradiction the gate caught on 2026-09-04 cannot come back silently;
- `/saved`, `/profile` and `/search` stay `noindex`, because each renders one
  visitor's own state;
- the homepage publisher graph asserts no founding date, address, telephone,
  social profile, named person, or rating. Those are not established anywhere
  in this repository, and structured data is not the place to guess.

Still separate, on purpose:

- `scripts/uptime-check.mjs` — a 30-minute liveness probe with no dependencies.
  Different cadence, different job.
- `scripts/launch-monitor.mjs` — Vercel alias inspection, which needs the
  `vercel` CLI and a login. Use it to confirm *which deployment* is live;
  use `verify:site` to confirm *whether it is fit to be*.

## Sampling

A full run inspects every URL in the sitemap. The default samples: all static
pages plus 8 articles, 5 area hubs and 3 topic pages, chosen deterministically
(sorted, then every Nth) so a failure is reproducible and coverage rotates
across the corpus rather than always hitting the newest articles. `--full`
checks everything.

Pages are fetched once and shared by every check, so a default run is roughly
one HTTP request per page — the same sourcing etiquette CLAUDE.md applies to
other people's sites, applied to our own.

## CI

`.github/workflows/site-quality.yml` runs it on pull requests, on a daily
schedule, and on demand with a target input. It uploads the log and a JSON
report as artifacts, and opens/closes a `site-quality` labelled issue on
scheduled failures.

Note the workflow includes a step that fails the job when the gate produces **no
output at all**, because that is an environment failure rather than a pass. If
GitHub Actions is unavailable on this repository (a prior workflow was failing
at the billing level), run the command by hand — it is designed to be equally
useful that way, and it is the same command CI runs.

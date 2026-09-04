# CREN coverage calendar

## Why this exists

Google organic is CREN's only real traffic channel. The largest traffic day on
record is **2026-08-27 — 50 pageviews, roughly 65% of that whole week** — and it
came from the Sugar restaurant story, published **two days before the venue
opened**. Search demand for an event spikes on the event's date. Coverage that
lands after the spike misses it entirely.

Until now that only happened by luck. Dated milestones were scattered in prose
inside published articles and in the standing "Monitoring Items" tables of the
daily briefs, and nothing told the 06:33 routine "this is due today."

The coverage calendar is the schedule that makes it a habit instead of an
accident. It answers four questions each morning: what is **due**, what has
already **slipped**, what is **coming**, and what we have **missed**.

## Storage: a table, plus a committed seed

Two files, on purpose.

| | |
|---|---|
| `frontend/content/coverage-calendar/seed.json` | the **provenance record**, in git |
| `coverage_calendar` (NeonDB) | the **operating copy**, read and written daily |

A flat file alone would not work: the calendar has a writer that is not a human
editing a file. `publish-article.mjs` closes an entry the moment a story
covering it goes live, and that write has to survive in the same place the
routine already authenticates to, be readable later by the weekly scorecard, and
not produce a git merge conflict between two runs on the same day. `briefs/*.md`
are immutable per-day records — a brief written on Sept. 4 cannot learn on
Sept. 22 that its entry got covered.

A table alone would not work either, on a journalism property: the sourcing
behind every date has to be reviewable in a diff. So the seed file carries every
entry with the article or brief it came from, and `coverage-calendar.mjs seed`
pushes it into the table.

A reseed **overwrites the editorial fields** (dates, sourcing, wording, priority)
and **never touches the operational ones** (`status`, `covered_by_article_id`,
`covered_at`, `missed_at`). Re-running the seed can therefore never erase the
record of what we covered or missed.

## The rule about dates

Every entry traces to a published CREN article or a committed brief. Nothing on
this calendar was invented, inferred, or sharpened.

- `source_article_id` and/or `source_brief` — **required**. The database refuses
  a row with neither (`coverage_calendar_has_provenance`).
- `source_url` — the URL that establishes the date. Required unless the entry is
  `unconfirmed`.
- `confidence` — `confirmed` (primary record or the organiser's own page),
  `reported` (a named outlet with a captured URL), `unconfirmed` (a date carried
  in one of our briefs whose establishing URL was never recorded, or where two
  of our own records disagree).
- `date_precision` — `day`, `month`, or `quarter`. A source that says only
  "September 2026" is stored as `month` on the **first** of that month; the seed
  validator rejects a month-precision date written on any other day, because
  that is how an approximate date silently becomes a specific one.
- `note` — where the caveat goes: a disputed date, an agenda that was not
  published when we recorded it, prior CREN coverage of the same event.

## States

`status` in the table is one of `upcoming`, `covered`, `missed`, `cancelled`.
What the routine actually reads is the **derived state**, recomputed from the
dates on every run so a stale stored status can never make the report lie:

| State | Meaning |
|---|---|
| `upcoming` | today is before `publish_by` |
| `due` | today **is** `publish_by` (default: event date − 2 days) |
| `overdue` | `publish_by` has passed but the event has not — the spike is still ahead |
| `missed` | the event date passed with nothing published |
| `covered` | an article covering it published (terminal) |
| `cancelled` | the event is off — not a miss (terminal) |
| `watch` | month/quarter precision, period not over — never due, never missed |
| `stale` | month/quarter precision, the stated period passed with no confirmation |

`watch` and `stale` exist so that a date we only know to the month can never be
counted as a miss. A spike you cannot date is not a spike you can miss, and
keeping those out is what makes the missed count mean something.

### Timezone

Columbus is `America/New_York`. Every date here is a calendar date string
(`YYYY-MM-DD`), never a `Date`, and all arithmetic runs through UTC midnight,
which has no DST. The only clock read in the whole module is `easternToday()`.
`node --experimental-strip-types --test tests/coverage-calendar.test.ts` pins
real instants either side of both midnights and both 2026 DST transitions.

## Daily use

From `frontend/`:

```bash
DATABASE_URL=... npm run newsroom:coverage-calendar
```

It prints a markdown block to paste straight into `briefs/<date>.md`: a
**Recommended today** line naming at most one real-estate and one lifestyle
entry (because CLAUDE.md gives the routine one of each), then Overdue, Due
today, Next 14 days, Watch, Missed, and Notes.

The ranking is deterministic:

1. **State** — overdue (1000) beats due (900) beats upcoming (800 minus 10 per
   day until `publish_by`) beats watch (100). Overdue outranks due because the
   ideal publish date has already slipped while the spike is still ahead of us.
2. **Confidence** — confirmed +60, reported +30, unconfirmed +0.
3. **Precision** — day +40, month +10, quarter +0.
4. **Priority** — the editor's 1–5, worth 20 points a step.
5. Ties break on the earlier event date, then the id.

A `neighborhood_candidate` entry is flagged in the report, because covering it
consumes the weekly Neighborhoods slot (`NEIGHBORHOOD_NEWSROOM.md`).

**A calendar entry is a peg, not a story.** The entry says a date exists and
where we got it; it does not say the story stands up. Verify against a live
source before drafting. If the date has moved, cancel or correct the entry and
publish nothing — the calendar never overrides "publish zero rather than force
a weak item."

### Other commands

```bash
# JSON instead of markdown, for a script
DATABASE_URL=... node scripts/coverage-calendar.mjs report --json --days 21

# validate the seed file without writing anything
node scripts/coverage-calendar.mjs seed --dry-run

# load or refresh the seed
DATABASE_URL=... npm run newsroom:seed-coverage-calendar

# persist the missed transition on its own
DATABASE_URL=... node scripts/coverage-calendar.mjs sweep

# close an entry by hand
DATABASE_URL=... node scripts/coverage-calendar.mjs cover <entry-id> --article <article-id>

# the event was called off — this is not a miss
DATABASE_URL=... node scripts/coverage-calendar.mjs cancel <entry-id> --reason "postponed indefinitely"

# reproduce a past day's report (read-only for any future date)
DATABASE_URL=... node scripts/coverage-calendar.mjs report --today 2026-09-22
```

`sweep` refuses a `--today` in the future. `--today` exists to reproduce a past
report; letting it run forward would let one command write "missed" against
events that have not happened, and the missed count is the number that tells us
whether any of this is working.

## Closing the loop

**Covered.** `publish-article.mjs` marks an entry covered after a successful
publish. It is wired in exactly like `publication-gate-log.mjs`: it runs after
the gate has decided, the whole block is wrapped, and neither a module that
fails to load nor a write that fails can change the exit code or the article
that was published. Worst case, nothing is recorded and the entry is closed by
hand.

Two ways an entry gets matched:

1. **Explicit** — put `"coverage_calendar_id": "<entry-id>"` in the article
   submission JSON. Always wins. Prefer this when you drafted the story *from*
   a calendar entry.
2. **Keyword** — every one of the entry's seeded `match_keywords` must appear in
   the article's title or body, *and* the article must publish inside the
   entry's window (`publish_by` − 7 days through the end of the event period
   + 3 days). If that leaves more than one candidate, **nothing** is marked and
   the ambiguity is printed, because a wrong "covered" mark hides a real miss.

**Missed.** Every report run sweeps day-precision entries whose date passed
while still `upcoming` into `missed`, writes `missed_at`, and logs a row in
`coverage_calendar_events`. `missed_at` records when we first noticed, not when
the sweep last ran. Nothing is retroactively forgiven.

**Cancelled** is deliberately separate from missed. An event that was called off
is not a story we failed to publish, and folding the two together would flatter
the number.

## Adding an entry

1. Find the date in a **published CREN article** or a **committed brief**. If it
   is in neither, it does not go on the calendar — report it first.
2. Add a record to `frontend/content/coverage-calendar/seed.json` with the
   `source_article_id` and/or `source_brief`, and the `source_url` that
   establishes the date.
3. Set `date_precision` and `confidence` to what the source actually supports.
   If two of our records disagree, mark it `unconfirmed` and say so in `note`.
4. Choose `match_keywords` that are distinctive but few — every one must appear
   for an auto-close, so two or three specific phrases beat a long list.
5. `node scripts/coverage-calendar.mjs seed --dry-run` to validate, then
   `npm run newsroom:seed-coverage-calendar`, then commit the seed file.

## Files

| Path | Role |
|---|---|
| `lib/coverage-calendar.ts` | pure date, ranking, matching and validation logic |
| `scripts/coverage-calendar-seed.mjs` | reads and validates the committed seed |
| `scripts/coverage-calendar-store.mjs` | schema, reads, writes, the publish hook |
| `scripts/coverage-calendar.mjs` | the CLI the routine runs |
| `scripts/migrate-coverage-calendar.mjs` | additive, idempotent migration |
| `content/coverage-calendar/seed.json` | the provenance record |
| `tests/coverage-calendar.test.ts` | date, transition, ranking and seed tests |

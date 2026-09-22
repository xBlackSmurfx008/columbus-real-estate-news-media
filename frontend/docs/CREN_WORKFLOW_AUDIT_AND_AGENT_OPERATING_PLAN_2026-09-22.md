# CREN workflow audit and AI-agent operating plan

Audit date: September 22, 2026. Evidence collected beginning 06:36 UTC. Status: recommendations, not an implementation or deployment.

## Decision

Build one connected, supervised operating system for CREN, not more disconnected agent scripts. First restore the missing operational integrations and close trust/security gaps. Then complete reporting, events, owner email review, distribution, and qualified lead handling. Expand commercial automation only after the delivery and measurement paths work.

The intended editorial workflow remains: research → evidence-backed draft → independent edit → proof emailed to the owner → requested corrections → revised proof → explicit approval of that version → guarded publication → public verification. A request for edits, silence, or an AI score is never permission to publish.

Owner-confirmed direction during this audit: **both a standalone local-media business and property-acquisition leads for the owner's business, with clear separation.** Do not assume all readers are acquisition prospects, turn reporting into a sales pitch, or launch referral-fee/capital-placement products.

## Scope and source of truth

- Inspected the release worktree at `/Users/mr.adams/dev/cren-automation-repair`, public website, production database aggregates, GitHub runs, Vercel deployment, and Resend domain/proof status. This worktree was initially clean.
- GitHub comparison confirms its code tree at `b191609` matches remote `main` at `929bd1ee7dbaee401700fed6f6ed50ed7dc43205`; the difference is merge ancestry, not files.
- Public aliases currently resolve to Vercel deployment `dpl_CWNyncU3duK3JEVYbyeUK531sLA5`, created September 21. Deployment READY is not used as evidence of workflow success.
- Inspected relevant historical implementations in `/Users/mr.adams/dev/cren-workflow-design-preview` and the heavily modified primary checkout `/Users/mr.adams/dev/columbus-real-estate-news-media`. Neither was edited. They are reuse candidates, not current production truth.
- This is a broad operational/code audit and a three-article writing sample, not a complete fact-check of all 104 stories, a penetration test, a legal clearance, or a browser accessibility/Core Web Vitals audit.

## Verified baseline

| Area | Current evidence | Interpretation |
| --- | --- | --- |
| Public corpus | 104 live articles; 1 draft | Substantial foundation, not a functioning daily publishing cadence |
| Freshness | Most recently created live row: September 12, 16:11 UTC; health reports 230.4 hours old | Publication is stale; code uses `created_at`, not a dedicated publication timestamp |
| Newsroom runs | Two records, both supervised September 21 attempts: one failed, one staged successfully | Does not prove the external daily cloud routine executes the new run contract |
| Website scan | All 191 sitemap pages fetched; 18 passing checks, 1 blocking, 2 advisory, 5 skipped | Eight broken internal destinations block the release-quality gate |
| Images | All 104 live heroes durable, reachable, fingerprinted, unique; 218 referenced images resolve | Technical integrity passes; not proof of image authenticity or visual quality |
| Market data | 21 verified observations across 11 geographies; consistency and configured freshness pass | Keep this canonical data system; do not duplicate numbers in generated articles/pages |
| Editorial proof | Provider confirms first proof delivered; review remains `AWAITING_REPLY` | Outbound works for this proof, not the whole correction workflow |
| Receiving | Review domain and both DNS records verified; receiving enabled; webhook enabled; inbox list empty | Prior DNS pending state has cleared; an actual reply cycle remains unverified |
| GitHub scheduling | Latest uptime run failed with `runner_id=0` and no steps; recent quality/health runs also failed | Cannot rely on GitHub as the sole monitor; account/environment cause needs owner-side resolution |
| Local tests | 249 passed, zero failures | Unit coverage does not establish scheduled or email end-to-end operation |
| Dependencies | Lockfile: Next 16.3.0, sharp 0.35.3; production audit: 15 moderate, 1 high, 1 critical | Prioritize dependency remediation; advisories do not prove exploitation |

Seven-day audience window, September 15–22: 83 recorded pageviews, 68 visitor-days, 61 article views, one new non-test subscriber, zero qualified leads, zero recorded revenue. All-time non-test totals: three subscribers, zero member accounts. Pageview measurement can include internal visits; a visitor-day is not a unique person or conventional session. No external payment ledger was reconciled, so collected cash is unknown rather than certified zero.

Two non-test inquiries are currently open and overdue, one rental and one general. “Non-test” does not establish that either is genuine. Five `campaigns` rows labelled inquiry must not be called qualified advertiser pipeline without reconciliation: the queue also contains five closed test advertiser inquiries. Six affiliate-program records are unconfigured.

## Findings, in repair order

### P0 — reconcile the release and policy boundaries

1. **Operational capabilities were lost between release lines.** The database records daily `operations_control_tower` completions September 15–21 and six historical CRM deliveries, latest September 21. Today `/api/cron/agent-control-tower` is 404 and the release tree lacks the CRM-sync module and calls. A September 15 release audit explicitly warned about these fork differences. Port the durable agent/repository and CRM integration slices with tests; do not merge the entire preview redesign or overwrite the dirty primary checkout. Evidence: historical `directives/2026-09-15-release-audit.md`; preview `src/agent/durable-store.ts`, `repositories/`, `workflows/control-tower.ts`, `lib/crm-sync.ts`; current `vercel.json` and intake routes.
2. **Agent instructions conflict with owner approval.** `../.claude/skills/cren-copywriting/SKILL.md:68` still orders immediate live publication without human review; `CLAUDE.md` and `docs/EDITORIAL_GATE.md` require approval. The staging code currently blocks that path, but contradictory instructions invite failed retries and unsafe workarounds. One versioned policy must govern every runtime, prompt and test. `.claude/routines.md` also names a local configuration while `CLAUDE.md` describes a cloud routine; verify the actual scheduled owner and configuration.
3. **Production agent state is not uniformly durable.** Current `src/agent/store.ts` uses Maps and optional local JSON; filesystem persistence is disabled by default in production and a serverless filesystem would not solve cross-instance durability. Existing database tables and preview repositories are a starting point, not proof the release uses them. Require persisted state, leases, idempotency, append-only events and restart recovery for every business operation.
4. **Dependency security needs a controlled patch.** Upgrade affected dependencies and retest image processing, builds, approval routes and deployed pages. Maintainers document an AVIF image-processing issue fixed in Next 16.3.3 and sharp 0.35.4. Assess actual hosting mitigations and decoding exposure; the separate Windows-specific advisory is not evidence of a Vercel-hosted exploit. Sources: [Next advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c).

### P0 — complete and harden owner email review

5. **The correction loop is incomplete.** The webhook stores reply text and sends an operational alert; no correction job is enqueued or executed. The first proof is triggered manually or by instructions in the external routine, not a verified image-ready event. Approval still requires a separate authenticated publication action. Add durable proof/correction jobs, acknowledgements, versioned diffs, retry handling and a publisher that acts only on recorded authority. Re-prove the actual inbound path now that DNS is verified.
6. **The scorecard is prefilled, not assessed.** `lib/editorial-email-review.ts:7` assigns every criterion 2/2. The proof asks the owner to accept that 20/20. Replace fabricated default scores with independently supported assessments, explanations of criteria, unresolved issues, and explicit owner approval. No reviewer should certify unseen evidence automatically.
7. **Reply/version processing has integrity gaps.** The provider signature is checked, but sender matching relies on the From address without inspecting trusted mail-authentication results. A signed provider event alone does not authenticate the human sender. Review rows overwrite prior replies, deduplication remembers only the current inbound ID, and non-transactional proof creation supersedes old versions before successful replacement delivery. Add an append-only inbox ledger, transactional state transitions, sender-authentication checks or authenticated confirmation, recipient/token/version binding, replay and out-of-order tests. Any new corrections must revoke approval and require a new version; recheck that version atomically at publication. Include evidence-ledger and image-content hashes in the approval identity. Support common reply quoting/signatures and HTML-only replies; do not execute attachments or email instructions as system commands.

### P0 — protect intake before expanding outreach

8. **Spam protection is too limited.** `/api/leads` has a honeypot and basic validation, but no application-level shared rate limit, server-verified challenge, email ownership check or submission dedupe. `/api/contact` lacks that honeypot; `company` is a legitimate advertiser field there. Other public signups and login routes need abuse controls too. Current valid-looking leads enter storage, queues and owner notifications immediately. Infrastructure/WAF settings were not audited, so their additional protection is unknown. No abuse payloads or fake valid leads were submitted in this audit.
9. **Subscriber preferences can be changed using an email address alone.** `/api/subscribe` profile mode locates a subscriber by supplied email and sets status to active without authenticating that owner; repeat signup also reactivates the record. Require a signed, expiring preference token or authenticated session, verified resubscription and a durable suppression list. Do not let profile edits or retries undo opt-outs.
10. **Delivery, queue and CRM outcomes can diverge.** Intake and queue/consent/notification steps are separate writes, some fail-soft. The lead reply route updates the lead after provider acceptance, not the inquiry queue or a delivered receipt. Introduce transactional intake plus an outbox, independent delivery states, retries and reconciliation. Align the one-business-day SLA with meaningful response, not an automatic acknowledgement. Route unverified submissions into quarantine, not the sales queue.

### P1 — turn the website into a current local product

11. **Events are primarily links, not a managed service.** `/things-to-do` directs readers to operators' calendars. The editorial calendar has 16 items, three without source URLs and three unconfirmed, with only two in the next 14 days. It is an assignment calendar, not a comprehensive public events database. `site_events` is analytics, not local events. Add event records, occurrences, provenance, cancellations, expiry, area classification and public filters; reuse existing calendar logic without conflating these datasets.
12. **Coverage taxonomy and cadence need redesign.** There are 24 citywide stories, 13 Downtown stories and sparse coverage elsewhere; some area values do not resolve to valid hubs. Four live rows have no area. The current Neighborhoods lane caps output at two articles weekly, which cannot be confused with daily updates across all areas. Keep broad source monitoring daily, then select distinct news by evidence and utility. Establish one canonical area registry, aliases, jurisdiction boundaries, source ownership and a last-checked coverage matrix.
13. **Public links need repair and regression tests.** The full scan finds seven broken story links plus `/areas/near-east-side`. Correct links or create valid canonical redirects after checking the intended story; never redirect unrelated missing articles merely to hide 404s. Broken story paths are listed below. Require internal-target validation in staging and all critical route assertions before promotion.
14. **Measurement can overstate readiness or results.** Thirteen live articles retain queued review states; sixteen image jobs retain legacy `AUTO_APPROVED` state. The readiness script reports `ok: true` because these are warnings. Funnel telemetry has zero rows, and the scorecard hardcodes an obsolete explanation that it is “not deployed yet.” Its “free member” conversion combines subscribers and members, while its membership table distinguishes them. Its recorded-revenue calculation combines signed order and won-lead values, not payment receipts. Fix definitions, add explicit unknown states and never equate signed value with collected cash. Do not manufacture approval when reconciling legacy rows.
15. **Marketing execution is still a pilot.** Current sequences use volatile state and server-local time, can miss stop-on-reply when a thread is already `sent`, and lack a durable suppression/opt-out lifecycle. Billing helpers manipulate records; they do not establish a working payment/collection system. Recover the existing CRM integration and durable repositories first, then test one approved sequence end to end before scale.

Broken story targets observed:

```text
/blog/columbus-zone-in-phase-2-public-comment
/blog/second-baptist-church-near-east-side-rfp
/blog/nrp-group-breaks-ground-on-336-unit-columbus-apartments
/blog/downtown-columbus-merchant-building-fall-2026-opening
/blog/discovery-district-parking-lots-518-apartments-96-million
/blog/columbus-livingston-avenue-170-apartments-mixed-use-2026
/blog/columbus-olde-towne-east-gets-65-unit-affordable-project-on-e-main
```

## Improve writing by improving reporting and editing

Keep the existing source/claim/entity ledgers, restrained voice, inline citations, canonical URLs and distinction between proposals and completed outcomes. The problem is not simply an insufficiently elaborate writing prompt.

The deterministic gate validates structure, supplied source metadata, domain counts and claim-string matches. It does not independently prove each source supports the claim, two domains represent independent reporting, or an interview actually occurred. Therefore “18/18” is not a factual accuracy certificate.

Three live articles sampled revealed concrete editing needs:

- The Lower Olentangy Tunnel story describes both a 3.5-mile tunnel and a 17,000-foot/3.2-mile tunnel without explaining the scope difference. Reconcile with the originating records before correction. The article also says a department did not respond; the sampled claim ledger contains no corresponding outreach claim. Require an actual contact-attempt record before such wording, without assuming the existing statement is fabricated.
- The mass-timber headline shortens a narrower student-housing superlative to “Tallest in US.” Preserve the claimed comparison class and attribution in the headline. Its closing extrapolates broader construction adoption; replace unsupported forecasting with the next verifiable checkpoint.
- The Maryland Avenue article still leads with a September 16 opening in future tense. Preserve the original publication date, add a status check/update when verified, and remove the event from upcoming modules after expiry. Do not silently invent that it opened.

Recommended editorial stages:

1. Assignment editor ranks novelty, timeliness, local specificity, public usefulness, evidence strength and coverage gaps. Sponsor value never affects newsworthiness. Search snippets and social posts are tips, not evidence.
2. Researcher retrieves originating records plus independent context. Record publisher, origin, source URL, observed status, event date versus publication date, fetched time, excerpt/page locator and content hash. Link amended records and contradictory reports. Keep lawful evidence excerpts, not unauthorized full-article archives.
3. Writer selects an appropriate format: concise news, public-record explainer, market analysis, neighborhood service piece, event card or weekly roundup. A single 350-word floor and 3–7 heading requirement should not force padded event cards. Introduce type-specific schemas, versioned prompts and tests together before changing gates.
4. Independent editor checks every material claim against retrieved evidence, recomputes arithmetic, checks geography, source independence, quote accuracy, headline/body scope, temporal language and rights. Fail with actionable missing evidence; do not simply praise or rewrite the writer's draft.
5. Copy editor removes repetitive “what this means” sections, generic property implications, SEO stuffing and duplicated openings. Read for natural local voice, concrete reader utility and supported conclusions.
6. Image editor prefers rights-cleared documentary photographs, approved official visuals, maps or sourced graphics. An AI illustration is labelled as such and never described as a photograph of a real event/property. Technical image validation remains mandatory.
7. Owner receives full copy, hero, sources, meaningful review findings and a concise revision diff by email. Edits return to the same assignment; unresolved requests remain visible. Publish only the final explicitly approved version.

Create a fixed evaluation set of 20 varied historical assignments, including the failures above and adversarial false facts. Compare prompt revisions against the same evidence. Proposed release bar: zero fabricated claims/quotes/contact attempts, all material claims supported, accurate dates/geography, working links, and at least 17/20 under the actual review rubric. Measure owner edit burden and correction frequency, not just article count.

## Target agent team and permissions

These are logical roles on a shared durable queue, not ten always-running services or ten separate paid subscriptions. Start with the critical reporting/review/intake path; expand roles when that path is proven.

| Role | Responsibility and output | Allowed boundary |
| --- | --- | --- |
| Operations coordinator | Dispatch jobs; track expected runs, dependencies, deadlines, budgets and incidents | Enqueue/retry/pause work, never grant editorial approval |
| News and public-record scout | Monitor approved sources; deduplicate developments; produce ranked assignments | Read sources and create evidence packets, no publication |
| Neighborhood and events desk | Check area-specific sources, event changes and cancellations | Stage verified event/hub updates, no unsupported availability claims |
| Reporter/writer | Draft original evidence-led copy and structured ledgers | Write versioned drafts only |
| Fact-check and copy editor | Independent source checks, calculations, readability and meaningful scorecard | Approve for owner review or return for reporting; cannot self-publish |
| Visual editor | Rights/provenance, relevance, captions, alt text and duplicate checks | Attach reviewable images, no paid generation without budget authority |
| Owner-review coordinator/publisher | Send proofs, ingest edits, schedule corrections, enforce exact-version approval | Publication only with valid recorded owner authority; verify live output |
| Audience/distribution desk | Prepare area digests, newsletter, approved social copy and relevant site placements | Send/publish only approved packages to eligible opted-in audiences |
| Intake and revenue desk | Quarantine spam, verify contact, qualify, assign, draft responses, maintain next actions | No lead resale, autonomous commitments or unapproved outreach |
| Reliability and finance reporter | Audit site/routes, missing runs, delivery, costs, receivables and collected cash | Report/escalate; no deployments, charges or silent data cleanup |

Architecture: reuse Next/Vercel for public/admin surfaces and authenticated triggers; Neon for durable jobs, versions, approvals and event history; existing Blob for images; existing mail provider and restored CRM adapter. Evaluate the installed Workflow integration and preview durable repositories before adding another orchestration product. Long reporting jobs belong in a bounded worker with checkpoints, not a long-running webhook request.

Every job needs `job_id`, workflow/version, input artifact/hash, area/entity, dedupe key, schedule timezone, status, attempt count, lease/heartbeat, due time, budget, source evidence, output artifact, error code and accountable owner. Use atomic claims, bounded exponential retries and dead-letter review. Record provider send IDs and CRM receipts; retry through an outbox to prevent duplicate sends/deals. A successful manual canary must not satisfy a missing scheduled-run heartbeat.

Separate production privileges: scouts receive no publication or CRM-send credentials; writers can stage only; the publisher invokes a guarded transition, not general unrestricted SQL. Web pages, mail and lead text are untrusted content. Block private/internal network fetching, isolate attachments, redact secrets/PII, limit tool access and model costs, and never let retrieved instructions override policy. Human financial/legal decisions remain outside autonomous authority.

## Daily, weekly and monthly operating schedule

All proposed times are America/New_York; nothing below was activated. Maintain local-time intent across DST. Vercel cron can trigger orchestration, but jobs need their own locks and idempotency; see [Vercel cron guidance](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

| Cadence | Work | Deliverable and gate |
| --- | --- | --- |
| Daily 05:45 | Coordinator checks integrations, expected runs, source health, limits and prior failures | Health record; pause affected lanes rather than hiding errors |
| Daily 06:00 | Scouts scan government, local reporting and organizer sources; refresh next 14/30-day watchlists | Ranked, deduplicated assignments with evidence and area coverage |
| Daily 07:00–09:00 | Report, independently edit, prepare images, stage | Initially retain max two strong articles/day; zero is valid when evidence is insufficient |
| Daily when ready | Review coordinator emails proofs and handles replies event-by-event | Acknowledged edits, correction job, revised proof and explicit final approval |
| Daily 11:00 and 16:00 | Event desk rechecks imminent events, cancellations, deadlines and developing-story checkpoints | Reviewed changes; urgent corrections escalated to owner |
| Throughout business hours | Intake worker verifies/quarantines; CRM worker assigns owner and next action; sweeper catches due work | Genuine requests receive a substantive response within the existing one-business-day promise |
| Daily 17:00 | Operations/revenue digest | Published/staged items, missing runs, edits awaiting action, overdue inquiries, spend and unresolved failures |
| Monday | Coverage and revenue planning | Area-gap map, evidence-backed assignments, true pipeline movement and no more than three commercial priorities |
| Wednesday | Approved business/community outreach | Small researched prospect batch and authorized follow-ups; stop on reply, opt-out, bounce or complaint |
| Thursday | Weekend Planner | Owner-approved, area-filtered roundup with current organizer links and cancellations checked |
| Friday | Weekly area/news digest, pipeline review, quality scorecard | Delivered newsletter receipts, verified lead outcomes, broken-link/correction review and next week's plan |
| Monthly, after source release | Market-data agent updates named datasets; analyst prepares a monthly explainer | Comparable source/geography/period, QA and owner-approved report; never estimate missing releases |
| Monthly | Source/area audit, commercial reconciliation and reliability exercise | Stale source repairs, credential/rights review, real cash vs booked value, retention, backup restore and worker-restart test |

Start weekly newsletters before promising daily subscriber delivery. An owner's daily review email is a separate product from a public newsletter. Reuse approved stories and verified event records; do not generate an unnecessary new article for every channel.

## Columbus area and event coverage

Retain the eight existing flagship hubs initially: Downtown, Arena District, Dublin, German Village, Hilliard, Upper Arlington, New Albany and Gahanna. Repair Near East Side taxonomy immediately. Add rotating coverage for Short North/Italian Village, Clintonville/University District, Franklinton/Hilltop, South Side, Near East Side, Northland, Bexley, Grandview, Grove City, Westerville, Worthington and other covered jurisdictions as source capacity allows. Geographic coverage should follow reader needs and civic importance, not only affluent areas or sponsors.

Maintain a source registry per jurisdiction/beat: source owner, URL, allowed retrieval method, cadence, terms/rights, last success, current hash and failure budget. Useful sources already identified include [Columbus Development Commission agendas/results](https://www.columbus.gov/Business-Development/Building-Zoning-Services/Boards-and-Commissions/Development-Commission), city legislation/permits, county records, MORPC and each municipality's own calendar. For activities use [Columbus Metropolitan Library](https://events.columbuslibrary.org/events), [Metro Parks](https://www.metroparks.net/) and [Experience Columbus](https://www.experiencecolumbus.com/events/) for discovery, confirming final details with organizers. Source availability is verified, but API/feed access, reuse rights and extraction adapters still need individual validation.

An event record needs organizer/source identity, canonical URL, venue/address, area/jurisdiction, local timezone, start/end, recurrence exceptions, price/fees, ticket/registration source, age guidance, accessibility evidence, last checked, cancellation status and review provenance. Unknown is a valid value. Do not guess accessibility, parking, availability or an exact day from month-only evidence. Deduplicate syndicated listings, retain cancellation history and automatically remove ended events from upcoming views without erasing the archive.

Website improvements: add Today/This weekend/Free/Kids/Area filters, source and “last checked” labels, follow-this-area preferences, one clear relevant next action per page, related coverage and public correction notes. Keep area market values consistent with the canonical dataset. Validate mobile form usability and accessibility separately; the HTTP speed results are not browser UX proof.

## Lead quality and spam protection

No solution can guarantee that nobody submits false information. The objective is to block most abuse and prevent unverified submissions from becoming trusted leads, alerts, CRM deals or outreach recipients.

Recommended sequence:

```text
Submission → validation/rate limit/challenge → dedupe → unverified intake
           → contact verification + risk review → qualified queue → CRM owner/SLA
           ↘ suspicious or failed verification → quarantine → review/expiry
```

- Add shared persistent rate limits across instances, with endpoint/IP/session/email dimensions, request-size limits and a global notification/send circuit breaker. Treat device/IP signals as risk evidence, not identity; shared networks and accessibility needs require a recovery path.
- Use a server-validated challenge such as Turnstile, checking expected hostname/action and rejecting replay/expired tokens. The widget alone is insufficient; [Cloudflare requires server validation and documents five-minute, single-use tokens](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
- Preserve an accessible honeypot using an unambiguous field name such as `website_url`; do not reject legitimate advertiser company names. Completion timing, duplicated messages and disposable domains are additional signals, not automatic proof of fraud.
- Normalize and bound fields, distinguish malformed requests from server failures, and return generic public errors. Do not expose database/provider error text.
- Use expiring single-use email verification and tightly rate-limited confirmation sends. A verified mailbox still does not prove a genuine seller, authorized property owner or qualified business. Ask for relevant, minimal qualification information; sensitive claims require human review.
- Store a server-owned risk score/reasons and source; never trust a submitted `is_test`, persona, attribution or campaign value as authority. Preserve newsletter consent separately from permission to respond to an inquiry or share it with a named service provider.
- Protect signup, preference edits, member/admin login, contacts, advertiser inquiry, profile claims, event submissions and analytics—not just the seller form. Add signed token/session checks for preferences and permanent suppression for opt-outs/complaints.
- Quarantined leads do not produce sales notifications, deals, partner distribution or marketing sends. The owner receives a bounded quarantine summary and can restore legitimate submissions. Use a documented retention period and restricted PII access.
- Validate with replay/concurrency tests, invalid/missing challenges, confirmation-email flooding, forged client fields, opted-out addresses, genuine shared-IP users, mobile/keyboard users, provider outage and CRM outage. Production canaries require explicit approval and marked test records.

## Revenue and outreach plan

The present bottleneck is dependable useful coverage plus verified, answered demand—not a lack of ad packages. Existing sponsor policies, packages and CRM assets should be reused. Current audience figures do not justify audience-scale promises.

### Two businesses, explicitly separated

| Boundary | CREN media operation | Owner's property-acquisition operation |
| --- | --- | --- |
| Purpose | Independent local reporting, events, useful area information and a sustainable media business | Evaluate voluntary seller/investor-property inquiries for the owner's business |
| Reader/customer consent | Newsletter, membership or a specific media/service inquiry | Explicit request to hear from the identified acquiring business; no automatic transfer of subscribers or tips |
| CRM pipeline | Media audience, sponsors, directory partners and event organizers | Seller inquiry → verified/qualified → consultation → underwriting → owner decision → transaction outcome |
| Agent authority | Editorial research/review and separately approved sponsorship fulfillment | Qualification and administrative follow-up; no autonomous offer, valuation commitment or investment promise |
| Money and metrics | Media cash receipts, delivery costs, subscriber retention and sponsor fulfillment | Acquisition conversion, actual deal economics and collected/realized results, not imputed value of raw leads |
| Public disclosure | Label sponsorship and disclose relevant ownership/conflicts | Name the actual business and explain who may contact or acquire the property before submission |

Use distinct pipeline/brand identifiers, communication templates and access permissions even if the same CRM hosts both. Keep sender identities and suppression/preferences clear; scope any shared data to the person's recorded permission. A paid sponsor or an acquisition opportunity cannot buy newsroom approval or dictate coverage. When reporting concerns the owner's interests, record and disclose the conflict and require independent editorial review. Confirm the acquiring entity's approved public name before launching or revising that funnel; do not invent a corporate/legal separation that has not been established.

| Opportunity | Recommendation now | Requirement before launch/expansion |
| --- | --- | --- |
| Own-business seller/investor inquiries | Repair intake, qualification, response and the separate acquisition CRM pipeline first | Clear owner/business identity and disclosure, actual buyer capacity, qualification and unit economics |
| Useful local directory profiles | Verify free profiles and interview potential service partners; prepare a clearly labelled paid pilot for owner review | Defined deliverables, credential checks, real reporting and explicit approval to open this previously deferred revenue line |
| Newsletter/area sponsorship | Build a consistent free Weekend Planner and area digest first | Proven deliveries and audience; signed sponsor terms; do not change prior launch thresholds without owner decision |
| Affiliate utility links | Consider a small relevant program only after approval | Real accepted agreement, working tracking, prominent compensation disclosure, fair comparison and measured attributable return |
| Local events or specialist reports | Customer discovery and draft concepts, not speculative production | Clear recurring reader demand, rights, fulfillment capacity and approved economics |
| Broad display ads/paid membership | Defer | Larger verified audience or demonstrated recurring member value; fix retention measurement before claiming demand |

Proposed outreach starts with existing legitimate inquiries and opted-in/business relationships, then a small owner-approved list of relevant businesses and organizers. Separate editorial requests for records/comment from sales outreach. Research fit from public business information, draft a specific offer, record contact provenance, obtain send approval, and log response/next action. One sequence should stop on any reply, opt-out, bounce, complaint or booked meeting. Cap total attempts and use recipient-local business hours; do not auto-restart paused sequences indefinitely.

Commercial email needs truthful identity/subject, required sender address and working opt-out handling, including business-to-business messages; see the [FTC CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business). Before monetizing real-estate settlement referrals or capital introductions, obtain qualified legal review; a flat-fee label alone does not make a referral arrangement lawful. The [CFPB's RESPA guidance](https://www.consumerfinance.gov/compliance/compliance-resources/mortgage-resources/real-estate-settlement-procedures-act/real-estate-settlement-procedures-act-faqs/) distinguishes actual marketing services from paid referral arrangements. This audit is not legal clearance.

Track each opportunity's owner, genuine buyer need, source/consent, stage, expected value with basis, next action/due date, last movement, blocker, fulfillment capacity and collection status. Report inquiries, verified contacts, qualified opportunities, booked value, invoices, collected cash and contribution margin separately. Do not price leads or forecast revenue until actual close rates and margins exist. Subscriber growth is not member-account conversion; model and source costs belong in unit economics.

## Implementation sequence and definition of done

Only three primary workstreams should be active. The following milestones are recommendations for the next authorized implementation, not completion claims or calendar promises.

1. **Restore and secure the foundation — engineering owner.** Reconcile release branches selectively; restore CRM/control tower; patch dependencies; unify policy; add endpoint abuse and preference-ownership safeguards; repair eight links. Exit: full release/route contract passes; replay-safe intake/CRM receipt verified in a controlled environment; restart preserves agent state; no unauthorized send/publication possible.
2. **Complete one editorial/event vertical slice — newsroom engineering + owner.** Pick one story and one real event, persist evidence, run independent review, deliver proof, receive an actual edit, produce revised proof, reject old approval, receive final approval and publish only the approved candidate. Exit: provider receipts, immutable version history, public page/image/source checks, correct event expiry/cancellation and an owner-visible audit trail. Then observe seven scheduled cycles, including a missing-run simulation and a legitimate no-story outcome.
3. **Activate owned-audience and commercial operations — audience/revenue owner.** Implement suppression, verified subscriber delivery, one approved outreach sequence, reliable inquiry SLA and honest scorecard. Exit: four consecutive approved weekly newsletter sends with receipts; opt-out/reply/bounce stop tests; no duplicate deals/sends; reconciled pipeline and payment-source reporting; one measured experiment tied to qualified demand. No minimum revenue result is promised.

Acceptance tests must also cover concurrent proof sends, out-of-order webhook deliveries, late correction after approval, changed image/evidence hash, source outages, forbidden/private URLs, model quota exhaustion, DST, invalid area aliases, retry after partial delivery, warm/cold worker restart and attempted self-approval. Freeze external actions when a dependency is unavailable; surface the reason, owner and next action.

## Verification and reusable commands

Reused existing scripts: `codex-workflow-check`, `newsroom-automation-health.mjs`, `production-readiness-audit.mjs`, `verify-site.mjs --target production --full`, `weekly-scorecard.mjs --window 7`, and `npm run test:image-pipeline`. Also used read-only provider/GitHub/Vercel inspection and `npm audit --omit=dev --json`. No new audit runner was needed.

For repeat checks, run from `frontend/` with approved production environment injection:

```sh
npm run newsroom:automation-health
npm run newsroom:production-readiness
npm run verify:site -- --target production --full
npm run newsroom:scorecard -- --window 7
npm run test:image-pipeline
npm audit --omit=dev
```

Do not add `--allow-write` during an audit. Do not assume every “report” is read-only: `coverage-calendar.mjs` ensures schema and normally sweeps statuses; this audit queried that table directly instead. Website invalid-input checks intentionally returned 400 without storing valid submissions. External-source sweep, valid production submissions, writable analytics and browser Web Vitals were skipped, not passed.

Changed in this review: this report only. Unchanged: application code, public content, production records/configuration, credentials, schedules, outreach, subscriptions and payments. No repair was deployed. Remaining uncertainty: actual external Claude routine settings/executions, inbound email round-trip, platform WAF and scheduled Vercel logs, real-user conversion, contact authenticity, complete corpus factual accuracy, commercial agreements, legal review and collected cash.

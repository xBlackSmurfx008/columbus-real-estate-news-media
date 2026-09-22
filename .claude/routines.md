# Scheduled Routines

Human-readable cadence is documented in `CLAUDE.md` and the current operating-plan document under `frontend/docs/`.
The external Claude cloud routine configuration must be inspected independently; this repository does not prove it is active.
Do not assume a local `~/.claude/routines.yaml` exists or is authoritative for production.
Track each configured job's expected execution and durable run receipt separately from manual canaries.

September22 cloud-only repair: actual cre-news-newsroom routine `trig_01K92dUMrzY5eMRQH7Pa6CUe` remains daily06:33EDT.
Its live instructions were replaced as one canonical body—without a preserved legacy prefix—and independently read back
with SHA-256 `d3254ad4794e720b0b27bd6b18093eb9b844ad96e5c759d0720f9681d9993134`. They include
frontend/prompts/CLOUD_ROUTINE_HANDOFF.md plus the current article-writing policy.
Do not inject DATABASE_URL into Claude's ordinary environment field. The public GitHub JSON/source-image package
is imported by protected Vercel jobs; main content is data, not executable code. Vercel import/image/proof cadence
is minute05/10/15 hourly. Mac image schedule is unloaded; paid revisions and paid image generation remain off.

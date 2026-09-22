# Scheduled Routines

Human-readable cadence is documented in `CLAUDE.md` and the current operating-plan document under `frontend/docs/`.
The external Claude cloud routine configuration must be inspected independently; this repository does not prove it is active.
Do not assume a local `~/.claude/routines.yaml` exists or is authoritative for production.
Track each configured job's expected execution and durable run receipt separately from manual canaries.

September22 synchronized cloud routines, independently saved and read back:

- `cre-news-newsroom` (`trig_01K92dUMrzY5eMRQH7Pa6CUe`), daily06:33EDT, SHA-256
  `f232a67d5491a14de3aacc00fb01416667126ac060b6dc2332aab3d50bc6743b`.
- `cre-news-social-listen` (`trig_012CStw9Z125jkXwk4hTD4KZ`), daily16:43EDT, SHA-256
  `fb3efde813b2edccd3417d611f2a0ec82afc0a2d01caefd9a96511ca8bd600bd`.
- `cre-news-weekly-seo` (`trig_016rhF74yLz6VhLQLvhJ3p35`), Sunday10:00EDT, SHA-256
  `b7161fe683b6ceedfc4cb10f1bc8dcf9ef6a34c85599d151e8b2f75093dd506a`.
- `cre-news-monthly-review` (`trig_014fQXTnGRGStYeFdeZXSvED`), first day monthly10:00local, SHA-256
  `7a74edeefb7170b22bbec11bebb9230b568254b365ff08d179f7d01a0b00cf2f`.

All four use only the CREN repository plus Google Drive and have push/email completion notifications enabled. The
newsroom prompt is a canonical body without a legacy prefix and includes the cloud handoff plus current writing policy.
Do not inject DATABASE_URL into Claude's ordinary environment field. The public GitHub JSON/source-image package
is imported by protected Vercel jobs; main content is data, not executable code. Vercel import/image/proof cadence
is minute05/10/15 hourly. Mac image schedule is unloaded; paid revisions and paid image generation remain off.

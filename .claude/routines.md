# Scheduled Routines

Human-readable cadence is documented in `CLAUDE.md` and the current operating-plan document under `frontend/docs/`.
The external Claude cloud routine configuration must be inspected independently; this repository does not prove it is active.
Do not assume a local `~/.claude/routines.yaml` exists or is authoritative for production.
Track each configured job's expected execution and durable run receipt separately from manual canaries.

September23 synchronized cloud routines, independently saved, reloaded and read back:

- `cre-news-newsroom` (`trig_01K92dUMrzY5eMRQH7Pa6CUe`), daily06:33EDT, SHA-256
  `28a4321e5658a281a170bbe27bc7f914c95bf3c3f3be73de1218c6ef7c23269d`.
- `cre-news-social-listen` (`trig_012CStw9Z125jkXwk4hTD4KZ`), daily16:43EDT, SHA-256
  `1ee8490c65c1d8cc22f8f3d37f69d701a3357dfc4026b9dcda3b8e9f1c25ec17`.
- `cre-news-weekly-seo` (`trig_016rhF74yLz6VhLQLvhJ3p35`), Sunday10:00EDT, SHA-256
  `829b6777946e45ae07d2c648eedc9aa86cb6c4983fb131e91bf1408c103871bf`.
- `cre-news-monthly-review` (`trig_014fQXTnGRGStYeFdeZXSvED`), first day monthly10:00local, SHA-256
  `44ccfa1463e32a8af72d9279e992cc2f664ad27c477fff89dbe9d73be2baf6f8`.

All four use only the CREN repository plus Google Drive and have push/email completion notifications enabled. The
newsroom prompt is a canonical body without a legacy prefix and includes the cloud handoff plus current writing policy.
Do not inject DATABASE_URL into Claude's ordinary environment field. The public GitHub JSON/source-image package
is imported by protected Vercel jobs; main content is data, not executable code. Vercel import/image/proof cadence
is minute05/10/15 hourly. Mac image schedule is unloaded; paid revisions and paid image generation remain off.

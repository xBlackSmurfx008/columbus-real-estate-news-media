# CREN Post-Launch Monitoring Log

As of: 2026-08-29
Scope: first post-launch production checks for `https://columbusrealestatenews.com`.

## Current Production Target

- Verified deployment: `dpl_AFrXs6nu7Un6v18W9LV3wiH319c2`.
- Verified deployment URL: `https://frontend-rg9mbzui9-stephen-s-projects-96d9c6b4.vercel.app`.
- Public aliases corrected to:
  - `https://columbusrealestatenews.com`
  - `https://www.columbusrealestatenews.com`
- Source commit pushed after launch package commit:
  - `f1d6a30 feat: launch CREN commercial readiness package`
  - Branch: `origin/feat/site-map`

## Immediate Monitoring Results

| Time | Check | Result | Action |
| --- | --- | --- | --- |
| 2026-08-29 14:41 UTC | Production submission smoke | Passed: contact, subscribe, lead, and member APIs returned 201 and verified production DB rows. | Cleaned smoke rows. |
| 2026-08-29 14:41 UTC | Smoke cleanup | Deleted 10 controlled rows: 1 contact, 2 subscribers, 1 lead, 1 member, 5 consent events. | Reran readiness audit. |
| 2026-08-29 14:41 UTC | Production readiness audit | `ok: true`, `findings: []`, zero smoke rows. | Passed. |
| 2026-08-29 14:44 UTC | Full production release audit | 150 pages, 86 area hubs, 36 screenshots, zero failures. | Passed. |
| 2026-08-29 16:12 UTC | Production readiness audit | `ok: true`, `findings: []`, zero smoke rows. | Passed. |
| 2026-08-29 16:12 UTC | Alias drift check | Custom domain had drifted to `dpl_5eiL97PTfp4iGWsEQ9DhgZApoxWv`; new launch routes returned 404 there. | Reassigned apex and `www` aliases to verified deployment `dpl_AFrXs6nu7Un6v18W9LV3wiH319c2`. |
| 2026-08-29 16:14 UTC | Public route checks | `/advertise/media-kit`, `/advertise/self-service`, and `/profiles/claim` returned 200 on apex domain. | Passed after alias correction. |
| 2026-08-29 16:14 UTC | Vercel production error logs | Error-log commands returned no error entries after fetching logs. | Continue monitoring. |
| 2026-08-29 16:25 UTC | Post-push alias and route recheck | `columbusrealestatenews.com` still pointed to verified deployment `dpl_AFrXs6nu7Un6v18W9LV3wiH319c2`; `/advertise/media-kit`, `/advertise/self-service`, and `/profiles/claim` returned 200. | Passed. |

## Commands Used

```bash
git push
node --env-file=.env.production.local scripts/production-readiness-audit.mjs
vercel inspect columbusrealestatenews.com
vercel alias set frontend-rg9mbzui9-stephen-s-projects-96d9c6b4.vercel.app columbusrealestatenews.com
vercel alias set frontend-rg9mbzui9-stephen-s-projects-96d9c6b4.vercel.app www.columbusrealestatenews.com
curl -fsSI https://columbusrealestatenews.com/advertise/media-kit
curl -fsSI https://columbusrealestatenews.com/advertise/self-service
curl -fsSI https://columbusrealestatenews.com/profiles/claim
vercel logs dpl_AFrXs6nu7Un6v18W9LV3wiH319c2 --level error --since 2h --json
vercel logs --environment production --level error --since 2h --no-branch --json
```

## Next Monitoring Windows

These checks require time to pass; do not mark them complete early.

- [ ] 6-hour check: confirm alias still points to `dpl_AFrXs6nu7Un6v18W9LV3wiH319c2`, route checks return 200, readiness audit is clean, and error logs have no new production failures.
- [ ] 24-hour check: review contacts, subscribers, leads, members, consent events, profile claims, advertising inquiries, and Vercel errors.
- [ ] 48-hour check: repeat the 24-hour check, then decide whether to move from launch monitoring to normal weekly operating rhythm.

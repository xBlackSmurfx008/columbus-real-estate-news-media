---
name: cren-website
description: Columbus Real Estate News website development, deployment, and management. Use this skill for ANY work on the columbusrealestatenews.com Next.js website — editing pages, components, styles, APIs, database, admin panel, build/deploy to Vercel, or debugging. Triggers on mentions of 'CREN', 'Columbus Real Estate News', 'the real estate site', 'the website', 'columbusrealestatenews', 'the frontend', or any reference to modifying/deploying the Next.js project.
---

# Columbus Real Estate News — Website Skill

## Quick Reference

| Item | Value |
|------|-------|
| **Live URL** | https://columbusrealestatenews.com (DNS live, www works too) |
| **Vercel Project** | `frontend` under scope `stephen-s-projects-96d9c6b4` (deploy with `vercel` from a linked dir; the old prj_DNobq…/team_bofjJ… IDs are stale — `vercel domains inspect columbusrealestatenews.com` confirms the binding) |
| **Framework** | Next.js 16+ App Router, TypeScript, Tailwind v4 |
| **Database** | NeonDB (PostgreSQL) via `@neondatabase/serverless` |
| **DB Connection** | `postgresql://neondb_owner:npg_5qx6sKPEdvBO@ep-shy-truth-amtfxuif-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| **Admin Login** | /admin/login — `admin@columbusrealestatenews.com` / `cren2026admin` |
| **Project Root** | Look for `frontend/` directory in the user's mounted folder |

## CRITICAL: Build & Deploy Process

You MUST copy the project to a clean build directory to avoid .DS_Store EPERM errors on macOS. Never build directly in the workspace folder.

```bash
# Step 1: Find the frontend directory (adjust path based on mounted folder)
WORKSPACE="mnt/Columbus Real Estate News Media Company"

# Step 2: Copy to build dir
rm -rf frontend-build && mkdir -p frontend-build
rsync -a --exclude '.DS_Store' --exclude 'node_modules' --exclude '.next' \
  "$WORKSPACE/frontend/" frontend-build/

# Step 3: Build
cd frontend-build
npm install
npx next build

# Step 4: Deploy
npx vercel --prod --yes
```

## Project Architecture

### App Router Structure
```
app/
├── (admin)/admin/     → Admin panel (login, dashboard, articles, ads, market, ticker, interviews, settings)
├── api/admin/         → 13 protected admin API routes
├── api/agent/         → 11 internal agent API routes
├── api/public/        → Public content JSON (all tables, 5-min cache header)
├── api/subscribe/     → POST: newsletter signup (areas[], topics[] → comma-sep in DB)
├── api/contact/       → POST: contact form (name, email, message)
├── page.tsx           → Homepage (async server component, getPublicData())
├── blog/              → Blog listing + [slug] article detail
├── market-data/       → Market snapshot + neighborhood comparison table
├── areas/ + [slug]    → Neighborhood hubs
├── topics/ + [slug]   → Topic pages
├── subscribe/         → Newsletter signup with multi-select chip form
├── contact/           → Contact form
├── buy/ sell/ rent/ invest/ improve/ resources/ advertise/ about/ privacy/
├── cren-v2.css        → Complete custom design system
└── layout.tsx         → Root layout (DM Sans, Playfair Display, Space Grotesk)
```

### Key Components
- `site-header.tsx` — Topbar → News Ticker → Nav → Journey Bar (all in `.cren-header-sticky`)
- `site-footer.tsx` — Footer with newsletter form
- `cren/home-sections.tsx` — V4 hero (eyebrow + tagline + CTAs + stat bar + featured card) + bento grid
- `cren/journey-bar.tsx` — Simple tab bar (NO portals, NO position:fixed)
- `cren/news-ticker.tsx` — Scrolling ticker from DB with fallback
- `subscribe-form.tsx` — Multi-select chip buttons for 15 areas + 5 topics
- `contact-form.tsx` — POSTs to /api/contact

### Key Libraries
- `lib/db.ts` — getDb(), initSchema() (12 tables), seedData()
- `lib/public-data.ts` — getPublicData(), getArticles(), getArticleBySlug(), generateSlug()
- `lib/auth.ts` — JWT auth (jose), requireAuth(), session cookies

## Database Tables (12)

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `articles` | id, status, featured, category, title, excerpt, body, author, date, area_slug, topic_slug | **status must be `'live'`** (not 'published') for public display |
| `ads` | id, name, type, status, placement, title, text, brand_name | status `'live'` = active |
| `market_snapshot` | label, value, change, direction, sort_order | 5 market stat cards |
| `hero_stats` | value, label, sort_order | Homepage hero stat bar (4 items) |
| `neighborhoods` | name, median, yoy, rent, dom, inventory, sort_order | 14 neighborhoods |
| `ticker_items` | text, active, sort_order | Scrolling news ticker |
| `interviews` | name, initials, role, topic, status, date | Expert interview lineup |
| `testimonials` | initials, name, role, quote | User testimonials |
| `settings` | key, value | Site config (emails, name, tagline) |
| `admin_users` | email, password_hash, name, role | Admin accounts |
| `subscribers` | email (UNIQUE), area, topic, source, status | Newsletter signups (comma-sep multi-select) |
| `contacts` | name, email, message, source, status | Contact form submissions |

## Connecting to DB Directly

```bash
cd "$WORKSPACE/frontend"
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_5qx6sKPEdvBO@ep-shy-truth-amtfxuif-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require');
(async () => {
  const rows = await sql\`SELECT * FROM articles WHERE status = 'live'\`;
  console.log(rows);
})();
"
```

Must run from the frontend directory so `@neondatabase/serverless` is available in node_modules.

## CSS Design System (cren-v2.css)

Key CSS variables:
- `--green: #2E7D4F` (primary brand green)
- `--cren-red / --red: #B8432F` (accent red for eyebrows, CTAs)
- `--gold: #C4952A`
- `--serif: 'Playfair Display'` (headings)
- `--sans: 'DM Sans'` (body)

Hero classes use `v4-` prefix (e.g., `.v4-hero`, `.v4-hero-grid`, `.v4-hero-h1`).
Subscribe chips use `.subscribe-chip` with `data-checked` attribute for selected state.

## ISR (Incremental Static Regeneration)

Pages with `export const revalidate = 300`:
- Homepage (`app/page.tsx`)
- Blog listing (`app/blog/page.tsx`)
- Market data (`app/market-data/page.tsx`)

Dynamic routes ([slug] pages) are server-rendered on demand (no revalidate).

After DB changes, pages auto-refresh within 5 minutes. For immediate updates, redeploy.

## Environment Variables

These must be set in Vercel project settings AND in `.env.local`:
```
DATABASE_URL=postgresql://neondb_owner:npg_5qx6sKPEdvBO@ep-shy-truth-amtfxuif-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require
ADMIN_JWT_SECRET=cren-prod-jwt-secret-x9k2m7f4p1v8
ADMIN_DEFAULT_PASSWORD=cren2026admin
```

## Common Tasks

### Add a new article
```sql
INSERT INTO articles (id, status, featured, category, category_class, icon, title, excerpt, body, author, date, read_time, area_slug, topic_slug)
VALUES ('a7', 'live', false, 'Market Analysis', 'card-img-market', '$', 'Title Here', 'Excerpt here', 'Full body here', 'Author Name', 'Mar 28, 2026', '8 min read', 'columbus-citywide', 'market-trends');
```

### Check subscribers
```sql
SELECT * FROM subscribers ORDER BY created_at DESC;
```

### Check contact submissions
```sql
SELECT * FROM contacts ORDER BY created_at DESC;
```

## Known Issues

1. Admin layout shows public site header — needs its own clean layout
2. Social links in footer go to generic platform URLs (not real accounts)
3. Some admin GET endpoints lack auth checks
4. No email delivery yet — data saves to DB but no SendGrid/Resend integration
5. DNS not configured at Namecheap (need A record → 76.76.21.21, CNAME www → cname.vercel-dns.com)
6. Hero search filter buttons (Price, Beds, etc.) are disabled / coming soon

## User Preferences

- **Do NOT deploy without showing a mockup and getting approval** for visual changes
- User wants the navigation permanently attached (no floating/portal elements)
- User prefers the V4 HTML file's design style (tagline hero, not news-article hero)
- Subscribe button was removed from nav per user request

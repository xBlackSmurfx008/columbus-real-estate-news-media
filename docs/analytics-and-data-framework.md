# Analytics and First-Party Data Framework

## Purpose

Create advertiser-ready audience intelligence using only first-party data with clear consent controls.

## Implemented Tracking Events

Tracked in `assets/app.js` and stored in browser local storage for MVP.

- `page_view`
- `scroll_depth` (50%, 90%)
- `cta_click`
- `follow_submitted`
- `consent_updated`

## Subscriber Data Model

Stored keys:

- Email
- Preferred area
- Preferred topic
- Preferred cadence
- Timestamp

## Consent Model

- `accepted`: full first-party analytics enabled
- `essential`: only essential storage and minimal operations

Consent banner appears until choice is made and logs `consent_updated`.

## UTM Standards

Use this naming system for campaigns:

- `utm_source`: `newsletter`, `facebook`, `instagram`, `linkedin`, `partner`
- `utm_medium`: `organic`, `paid`, `referral`, `sponsored`
- `utm_campaign`: `area_topic_month` (example: `dublin_market_apr2026`)
- `utm_content`: content variation identifier (example: `hero_cta_a`)

## Reporting Views (Weekly)

- Audience by area (views, follows)
- Audience by topic (views, follows)
- Subscriber growth and follow preferences
- Content engagement (scroll depth and CTA clicks)
- Lead form submissions by source page

## Governance Checklist

- Privacy page live and linked sitewide
- Consent banner active
- Unsubscribe and deletion requests handled through contact workflow
- No third-party data broker enrichment in MVP phase

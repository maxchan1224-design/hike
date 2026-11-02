# DAYCATION HK — Phase 1: official activities backend

**Status: code prototype, not deployed. No claims of live coverage or live availability.**

## What is implemented

- Official LCSD cultural programmes import from three documented datasets:
  `events.xml`, `eventDates.xml`, `venues.xml`.
- Join by official event ID and venue ID; normalise the next 60 days.
- Every public item requires official provenance. Social posts only go into nonpublic leads table.
- D1 schema; per-event date records; duplicate avoidance using stable source IDs.
- Failure-safe sync: if feeds are empty, structurally wrong, or unexpectedly shrink, abort before deactivating events.
- After two complete healthy syncs without a previously listed event, hide it; never fabricate cancellations.
- Expire past occurrences. Record all sync attempts and failures.
- Cloudflare Cron set for 23:00 UTC = 07:00 Hong Kong time (next day).
- GET `/api/events?from=2026-11-14&to=2026-11-15&limit=40&q=...` and GET `/api/health`.
- Admin-only POST `/admin/sync` with `Authorization: Bearer <ADMIN_TOKEN>`.

## Actual deployment checklist

1. Open this folder in a machine with Node.js / npm, run `npm install` and `npm test`.
2. Authenticate with Cloudflare using `npx wrangler login`. Use your own account.
3. Run `npx wrangler d1 create daycation-hk-events` and paste the **returned database ID** into `wrangler.jsonc`; do not keep the placeholder.
4. `npx wrangler d1 migrations apply daycation-hk-events --remote`.
5. Set admin token: `npx wrangler secret put ADMIN_TOKEN`. Use a long random string, never commit it to GitHub.
6. `npx wrangler deploy`.
7. Test `/api/health` and POST `/admin/sync` with the bearer token, then query `/api/events?from=<today>&to=<in-30-days>`.
8. Confirm result count, dates, venue and official event URLs against LCSD. If parsing fails due to source shape, inspect current XML and adapt the normalizer before running scheduled imports.
9. Only after a successful live sync, point DAYCATION HK's frontend at the new Worker API.

## Important limitations

- This first connector covers LCSD cultural programmes **only**. It does not yet include URBTIX, SmartPLAY, Timable, Instagram or Threads. The discontinued pre-2024 leisure dataset is intentionally excluded.
- LCSD date records define **calendar days**, not necessarily accurate performance start times; `time_text` is displayed as provider text, not converted to a guessed start time.
- The code has offline normalisation tests, but the XML endpoints were not accessible from the local development environment. A first live import is required to confirm the real XML wrapper and date node shapes.
- No automated site-wide social scraping; ingestion of social leads will require rights-compliant API access, organiser verification and manual review.
- No account or personal data syncing, no Calendar export.

Official dataset: https://data.gov.hk/en-data/dataset/hk-lcsd-event-event-cultural
Spec: https://www.lcsd.gov.hk/datagovhk/event/data_dictionary.pdf
Cloudflare scheduled handler: https://developers.cloudflare.com/workers/configuration/cron-triggers/

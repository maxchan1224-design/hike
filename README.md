# DAYCATION HK · 香港當旅行

**One repository, one existing Cloudflare Worker.** The GitHub repository remains named `hike`, and the Cloudflare Worker remains named `hike` (`hike.maxchan1224.workers.dev`). There is **no separate** `daycation-hk-events` Worker. That string is only the **D1 database name**.

## Product
- iPhone-first app with five tabs: 全部活動 / AI 推薦 / 收藏 / 行程 / 個人化.
- Save activities, build local day trips, tune preferences. No .ics export.
- Personalised recommendations are **on-device rules**, not a live AI model.
- Historical sample activities remain clearly marked as demos and are not current listings.

## Architecture
- `public/`: web app and static assets.
- `src/worker.mjs`: routes `/api/*` and `/admin/*` to the activity backend, serves assets otherwise.
- `backend/src/`: official LCSD XML feed normalisation and D1 API.
- `backend/migrations/`: D1 database schema.
- `wrangler.jsonc`: **root configuration targeting existing Worker `hike`**, binding `DB` to `daycation-hk-events` D1.
- `public/data-config.js`: same-origin API connection; no second-worker URL.
- A daily UTC 23:00 Cron trigger means 07:00 Hong Kong time.

## Deploy to existing `hike` Worker
From the repository **root** (not `backend/`):

```bash
npm install
npm test
npx wrangler d1 migrations apply daycation-hk-events --remote
npx wrangler deploy
```

If using Cloudflare's GitHub integration, set **Root directory = repository root**, not `backend`; deploy command `npx wrangler deploy`. **Apply the D1 migration before relying on the API.** Confirm the D1 database ID in the root config matches your own database. A manual migration may also be run in the Cloudflare D1 SQL editor using `backend/migrations/0001_init.sql`.

Do not create another Worker. Publishing to `hike` intentionally replaces the website served by that existing Worker. GitHub repository name stays `hike`.

After migration/deploy:
- `https://hike.maxchan1224.workers.dev/`: DAYCATION HK app.
- `https://hike.maxchan1224.workers.dev/api/health`: D1 / data freshness check; `live:false` before successful sync is expected.
- `https://hike.maxchan1224.workers.dev/api/events`: only verified official future events.
- `POST /admin/sync`: optional manual sync; requires separately configured Cloudflare secret `ADMIN_TOKEN` (never put it in GitHub or chat). Otherwise wait for the daily Cron.

A healthy `/api/health` response does **not** guarantee the official feed was synced. The backend has not yet passed a real-feed end-to-end import in this environment; validate official programme fields and sync logs before relying on results.

Social media posts (including Threads and Instagram) remain **discovery leads only**, not public activities without independent organizer confirmation. The current API covers LCSD cultural programmes, not all Hong Kong activities.

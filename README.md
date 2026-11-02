# DAYCATION HK — 香港當旅行

iPhone-first Hong Kong local day-trip and verified-activities explorer.

**Status (2026-11-02):** Frontend interactive prototype with demonstration events. Backend ingestion and D1 code is present but **not yet deployed**. No live coverage or live AI model is claimed.

## App
- Five tabs: 全部活動 / AI 推薦 / 收藏 / 行程 / 個人化.
- Save events, select an activity, build a local day trip and tailor preferences.
- Suggestions currently use local interest-matching, not a hosted AI model.
- Current event cards are illustrative verified-event examples, not a synchronized city-wide feed.
- No .ics export (intentionally removed at user request).

### Frontend (Cloudflare Worker static assets)
```bash
npm install
npm run dev
npm run deploy
```
Static assets: `public/`. Worker name: `daycation-hk`.

### Verified events backend (Cloudflare Worker + D1)
Backend source: `backend/` (see `backend/README.md`).
Before production deploy, create a D1 database, replace the database ID placeholder and apply migrations. The frontend **is not yet connected to the backend endpoint**; do not treat the demo events as live.

## GitHub / Cloudflare migration
This project was originally created in GitHub repository `hike`. The former Hike code is preserved in branch `backup/hike-before-daycation-20261102`. The main branch now contains only DAYCATION HK.
Rename the GitHub repository using **Settings → General → Repository name → daycation-hk**. A repo rename is not available through the connected GitHub tools.
After deploying the new site, remove the previous `hike` Cloudflare Worker/project separately if no longer needed. Changing `wrangler.jsonc` does not delete a separately deployed Worker.

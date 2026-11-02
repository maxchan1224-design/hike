# DAYCATION HK — 香港當旅行

An iPhone-first local day-trip planner with an official-sources-first activity catalogue. GitHub repository name **hike** remains unchanged at the owner's request.

## Current status

- **Frontend:** 5 tabs (全部活動、AI 推薦、收藏、行程、個人化), demo itinerary and browser-local saved preferences.
- **Official activities integration:** read-only LCSD adapter has been implemented. It only displays source-tagged, verified event records when a backend endpoint is configured and responds successfully. Each imported programme is linked to its official source. Official feeds may not include exact clock times; when absent, users must choose their own planning time, not mistake it for a confirmed session.
- **No live data yet:** backend D1 database and Worker have not been deployed. Until then, old activity examples remain visibly marked 示範. No AI model is connected; recommendations are preference-ranking demo logic.
- **No .ics export.** A user can save activities and assemble a day trip locally.

## Frontend deployment

```
npm install
npm run dev
npm run deploy
```

This site deploys to a **Worker named `daycation-hk`**. This does not rename GitHub `hike` and does not automatically delete previous Cloudflare deployments.

`public/data-config.js` initially contains:

```javascript
window.DAYCATION_DATA_API = '';
```

After the backend has been deployed, its D1 migrations applied, and `/api/health` and `/api/events` verified, set this to its deployed HTTPS origin (e.g., the actual Cloudflare Worker origin returned by deployment; **do not guess a URL**). Without this setting, the UI says 官方活動資料尚未接通 rather than pretending sample events are live.

## Verified backend

See `backend/README.md` for D1 setup and the Cloudflare Worker instructions. Backend supports pagination (`limit`, `offset`) and `/api/health` reports stale-sync status separately from ticket availability.

## Testing

```
node --test test/*.test.mjs backend/test/*.test.mjs
```

These validate adapter source checks and LCSD normalization with synthetic examples. Actual LCSD feed ingestion and Cloudflare D1 deployment still need integration testing. Browser navigation in the current execution environment is blocked, so visual/mobile UI validation must be done using an accessible deployed preview.

## Safety and provenance

- Official origin and verification flags are mandatory for publishing synchronized entries.
- Third-party social media posts are research leads, not evidence sufficient for public display.
- All API failures surface a clear status and never silently re-label demos as current events.
- Importing programmes never claims real-time reservation or ticket availability.
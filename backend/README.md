# DAYCATION HK — official activities backend (part of existing hike Worker)

This directory contains the D1 migration, LCSD source parser, read-only public API and scheduled importer. **Do not deploy this folder as a separate Worker.** The root `src/worker.mjs` imports `backend/src/worker.mjs` and the root `wrangler.jsonc` sets the Worker name `hike` and D1 database `daycation-hk-events`.

## Data safety
- Verified official LCSD programme feed only; social posts are stored as nonpublic leads, never auto-listed.
- Future calendar occurrences retained; stale programmes hidden after two healthy misses.
- Fail-closed on malformed or unexpectedly small official feeds.
- `/api/health` reports freshness, not ticket availability. `/api/events` paginates events, does not claim all-HK coverage.

## First-time setup
Run from repository **root**:
```bash
npm install
npm test
npx wrangler d1 migrations apply daycation-hk-events --remote
npx wrangler deploy
```
The D1 database must already exist and be bound in root `wrangler.jsonc`.

`/api/health` starts at `live:false` before first successful sync. Scheduled import runs daily at 07:00 HKT. For a manual import, add `ADMIN_TOKEN` as a Worker secret and POST `/admin/sync` with the bearer token. Keep it secret.

Until deployed and the first XML import is verified, this is code prepared for synchronization, not confirmation of live event coverage.

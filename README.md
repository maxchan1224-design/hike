# Hike

A standalone hiking journal and visual-story app.

## Current MVP

- Manual route creator with mountain-aware suggestions.
- Elevation story with moving hiker preview.
- Lightweight Start / Finish recording with no continuous GPS.
- Route map for routes with coordinates.
- Demo routes for Poon Hill and Lantau Peak.
- Local-only storage for route drafts and lightweight records.

## Cloudflare deployment

This repository is configured for **Cloudflare Workers Static Assets**.

Structure:

```
public/
  index.html
  manifest.webmanifest
wrangler.jsonc
package.json
```

Cloudflare build/deploy settings:

- Production branch: `main`
- Build command: leave blank, or `npm install`
- Deploy command: `npx wrangler deploy`
- Root directory: repository root
- No Pages project is required.

Local preview:

```bash
npm install
npm run dev
```

Deploy manually:

```bash
npm install
npm run deploy
```

## Product direction

The goal is not another fitness dashboard. Hike turns a real hiking journey into a short visual story: route order, elevation, famous mountains, companions, and a shareable animation.

# DAYCATION HK — 香港本地 Day Trip Explorer

The **GitHub repository and Cloudflare Worker remain named `hike`**. No rename is planned.

## Product experience

- Five tabs: 全部活動 / AI 推薦 / 收藏 / 行程 / 個人化.
- iPhone-first summary cards with date, location, admission, organizer, save and add-to-trip.
- All Activities defaults to upcoming events, filtering by nearest weekend / 7 days / free / region / interest category / text.
- Eight activities per page; choose "顯示更多" to reveal the next eight.
- Saved activities, personal interests and day trips are kept in browser local storage.
- Recommendations currently use **local preference-matching**, not generative AI.

## Data policy — source first, not volume first

The site deliberately **does not show the 803 bulk-imported LCSD cultural programmes**. Their records remain in D1 for now but are not mixed with the public curated feed.

The initial curated list in `public/curated-activities.js` contains nine organizer-verified event entries checked against organizer pages on 2026-11-02. This is a **static editorial pilot**, not a continuously updated, exhaustive or real-time calendar. Each event links to organizer evidence, and schedules, booking and ticket availability must be checked again before a visit.

Prioritize Tai Kwun, WestK, PMQ, HKDC, HKEYAF, venues, classes and independent organizers. Timable, art-mate, Eventbrite, Threads, Instagram, Facebook and Xiaohongshu are **discovery leads only**. Publication requires corroboration from the official organizer website/account or confirmed ticketing channel. Do not invent event details.

The D1 LCSD database remains bound to the existing `hike` Worker but the **scheduled importer has been explicitly disabled** in the root `wrangler.jsonc` by `triggers.crons: []`. This removes the nightly LCSD refresh at next successful deployment without deleting D1 tables or records. The older `/admin/sync` manual endpoint should not be used for the public curated catalogue; it is not connected to that catalogue.

## Future implementation

1. Build source registry of official organizers, verified profile URLs and update policies.
2. Discovery -> pending lead -> organizer corroboration -> approved activity -> periodic revalidation/expiry.
3. Publish only verified events via D1 paginated API and show last verified time / source links in UI.
4. Personalized ranking on only verified, future events; transit-aware itinerary planning later.

## Deploy
The root configuration targets the existing Worker named `hike` and serves `public/` plus API. Normal deployment remains `npx wrangler deploy` from repo root.

The former website and sample weekend trips are still present in local demo history but are not mixed into the new curated public list. No .ics export.

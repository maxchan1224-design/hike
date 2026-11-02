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


## V0.5 — image-optional cards and organizer discovery

- Activity and AI recommendation cards use **real organizer photos only when `photoUrl` is provided and `photoVerified: true`**. With no trusted photograph, the card becomes a clean, full-width text card — **no decorative icon placeholder**. Failed image requests also hide the image.
- The approved organizer registry is in `backend/src/source-discovery.mjs`: Hong Kong Design Centre, Tai Kwun, PMQ, Hong Kong Arts Centre, DESIGN@HKG and Hong Kong Youth Arts Foundation.
- Daily 07:00 Hong Kong-time Cron runs **organizer-link discovery only**. It does not rerun the unwanted bulk LCSD feed. Existing historical LCSD data remain stored but are not published in the app.
- `GET /api/sources`: public registry of approved official listing sites.
- `POST /admin/discover`: **ADMIN_TOKEN required**, scan only those six approved listings; store newly discovered URL candidates in existing D1 `activity_leads` with `review_status='pending'`, `organizer_verified=0`.
- `GET /admin/leads`: **ADMIN_TOKEN required**, read 100 newest unreviewed official-page leads.
- The discovery queue is private. **A link is not an event.** It must be checked for a real organizer, exact dates, venue, pricing and an official booking page before adding to the public curated list.
- Social posts and Threads may be submitted as future leads only; no automatic publishing from social content.
- Current nine curated event entries remain an **editorial static pilot**, not a daily synchronized full-Hong-Kong catalogue. Updating the frontend from reviewed leads needs an additional human approval/publication workflow.
- Image URLs are never invented. Organizer imagery must be explicitly checked for authenticity and permitted reuse, and a blocked/missing image has a text-only fallback.

### Admin-only discovery smoke test (from your own site DevTools)

```js
(async()=>{
  const token=prompt('ADMIN_TOKEN'); if(!token)return;
  const r=await fetch('/admin/discover',{method:'POST',headers:{Authorization:'Bearer '+token}});
  console.log(r.status,await r.json());
})();
```

The results show `new_leads` and a per-source scan status, **not** newly published events.
Do not paste your token into the repository, screenshots or chat.

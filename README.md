# FloodWatch

A real-time flood monitoring map for Nepal. Scrapes river-level and rainfall
readings from the Department of Hydrology and Meteorology (DHM,
`dhm.gov.np`), computes a risk level per station, shows them on an
interactive map, and emails subscribers when a station they're watching
crosses their chosen severity threshold.

Live: https://floodwatch-web-wine.vercel.app

## Stack

- **Next.js** (App Router) — frontend + API routes, hosted on Vercel's free Hobby tier
- **Firebase Auth** — Google sign-in for operators/admins
- **Firestore** — the only datastore. `stations` holds the latest reading per
  station (overwritten each sync, no historical time series); `config/stationsSnapshot`
  is a single aggregated doc the public map reads, to avoid ~300 reads per page load;
  `subscriptions` holds per-user station + severity alert preferences
- **Leaflet / react-leaflet** — map rendering

This is a full rewrite of the old NestJS + Postgres + Redis stack (see
`../Flood-warn-backend`, `../Flood-warn-frontend`), kept only as reference
for porting logic — not deployed anywhere anymore.

## How data flows

1. `src/lib/dhm-fetch.js` scrapes `dhm.gov.np/hydrology/floodMonitoring`,
   parsing the `riverwatch_coordinates` and `rainfall_coordinates` JS arrays
   out of the page HTML.
2. `GET /api/sync` (`src/app/api/sync/route.js`) runs that fetch, computes
   risk per station (`src/lib/risk.js`), estimates rise rate from recent
   history (`src/lib/rise-rate.js`), writes everything to Firestore, and
   dispatches alert/de-escalation emails to affected subscribers.
3. `GET /api/map-data` reads the single cached snapshot doc — this is what
   the map page polls every 60s and what the "Refresh" button re-fetches.
   **Refreshing the page does not re-scrape DHM** — only `/api/sync` does that.
4. Something has to call `/api/sync` periodically, or the snapshot goes
   stale (and flips every station to OFFLINE after 90 min). That's handled by:
   - A Vercel Cron Job (`vercel.json`) hitting `/api/sync` once a day —
     Vercel's Hobby plan only allows daily cron, no more frequent option
     without upgrading to Pro.
   - Optionally, an external free pinger (e.g. cron-job.org) hitting
     `/api/sync?secret=$CRON_SECRET` every 15–30 min for more realistic
     freshness than once/day.

`/api/sync` accepts the secret either as Vercel sends it automatically
(`Authorization: Bearer $CRON_SECRET`, since the env var is named exactly
`CRON_SECRET`) or as a `?secret=` query param for external pingers.

## Environment variables

See `.env.local` (not committed) for the full list:

- `NEXT_PUBLIC_FIREBASE_*` — Firebase client config (safe to expose)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin SDK service account
- `ADMIN_EMAILS` — comma-separated emails auto-granted the admin role on first sign-in
- `CRON_SECRET` — shared secret `/api/sync` requires; must be named exactly this for Vercel's automatic header injection to work
- `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `ALERT_FROM_EMAIL` — Microsoft Graph API (app-only) credentials used to send alert emails
- `APP_URL` — public URL of the deployed app, used for links inside alert emails

Push these to Vercel with `vercel env add <NAME> production`.

## Known gotcha: jose/jwks-rsa ESM crash

`firebase-admin/auth` pulls in `jwks-rsa`, which depends on `jose@^6`. `jose@6`
ships ESM-only, but `jwks-rsa@4.1.0` still does a plain CommonJS `require('jose')`
internally — this works fine under `next dev` but throws `ERR_REQUIRE_ESM` in
Vercel's production Node runtime. Fixed via an `overrides` entry in
`package.json` pinning `jose` to `5.9.6`, the last version with a proper dual
CJS/ESM build.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. Hit `/api/sync?secret=$CRON_SECRET` manually to
pull fresh DHM data into Firestore before viewing `/map`.

## Deploy

```bash
npx vercel link
npx vercel env add <NAME> production   # for each var above
npx vercel --prod
```

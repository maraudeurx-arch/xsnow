# Testing pyramid (Open Community / xsnow)

The app is a static Next.js export. Tests stay in three layers so PRs fail fast without a browser, then smoke the GitHub Pages-shaped `out/` build.

## Unit (`npm run test:unit` or `npm test`)

Node’s built-in runner (`node --test`) plus `--experimental-strip-types`. Fast, no browser.

Covers pure lib helpers:

- UGC sanitization (`src/lib/sanitize.ts`)
- Geo / place fallbacks (no fake Gatineau on far coordinates)
- Country ISO → regional ambiance (`src/lib/region.ts`)
- Invite query parsing
- Versioned public catalog / publish gate
- Client-side stats event shaping
- Owner idea inbox payload sanitization (`src/lib/idea-inbox.ts`, `workers/xsnow-chat/src/ideas.ts`)
- Worker CORS allowlist (`workers/xsnow-chat/src/cors.ts`) — GitHub Pages + opencommunity.app, never `*`
- Consent-based proximity alerts: weekly schedule, 5/10/20 km, invite token, geofence, Twilio SMS soft-fail (`src/lib/proximity-alerts.ts`, `src/lib/alert-sms.ts`, `workers/xsnow-chat/src/alerts.ts`)
- Neighbourhood news fetch timeouts (Worker + JSON RSS fallback) and Accueil partner-slot config (`src/lib/neighborhood-news.ts`, `src/lib/partner-ads.ts`)
- Full-height ads reel seeds, avatar coach paths (no income promise), business AI draft without Facebook scrape (`src/lib/community-ads.ts`, `src/lib/coach.ts`, `src/lib/business-draft.ts`)

```bash
npm test          # unit + functional
npm run test:unit
```

## Functional (`npm run test:functional`)

Still Node, still no browser. Module-level flows that compose storage + catalog + offers + ideas:

- Fresh `localStorage`: Mes services / En demande empty (legacy featured car id dropped)
- Neighbourhood service kinds (`courses`, `demenagement`, `garde`, `pret`) stay empty; demo `seed-*` ids never list
- Vos idées stay on-device; an empty catalog does not resurrect them
- Publish gate: incomplete car offers and unpublished catalog rows never list
- Onboarding helpers: avatar → welcome speech → geo (`welcomeSpeechReady` / welcome gate / `canShowConsentSheet`)
- Transparency routes exist; About/version note and contact use `APP_VERSION` / `OPC_PUBLIC_EMAIL`

## End-to-end (`npm run test:e2e`)

Playwright against a **production-like static export**, one iPhone viewport (`390×844`).

1. Build the Pages artifact:

   ```bash
   npm run build
   ```

2. Install the browser once (local):

   ```bash
   npx playwright install chromium
   ```

3. Run the smoke suite (serves `out/` at `/xsnow/`, same `basePath` as GitHub Pages):

   ```bash
   npm run test:e2e
   ```

`scripts/serve-e2e.mjs` maps `/xsnow/` → `out/` because `npx serve out` would 404 `_next` assets requested under `/xsnow`. Same command: `npm run serve:static`.

Critical paths:

- Accueil: Nouvelles du Quartier settles (not infinite loading); labeled Espace partenaire slots; home card almost reaches the footer
- `/pubs`: full-height ads reel with Bogo (download), daycare flyer, Gatineau ~533 $/month 1 Oct summary
- `/coach`: questions then 3–5 paths; copy never promises income
- `/business`: Workers AI draft assist; Facebook URLs are refused
- Fresh storage: Mes services / En demande empty (no bundled Gatineau car offer)
- Fresh storage: `/services/{kind}` boards empty (no demo seed titles)
- Regional ambiance: autumn before geo; Caribbean for `?city=Port-au-Prince`; CA stays seasonal
- Gagner maintenant / Vos idées / Mes compétences: local sign-up (Mon profil) before the form
- Vos idées: submit stays in `localStorage` (device wall); a sanitized copy is POSTed to `/ideas` (e2e stubs the Worker so CI does not pollute production). Payload is text + city + date + OPC id — never visitor phone/email. WhatsApp is documented as a later optional channel, not implemented.
- Alertes de proximité: guardian form (prénom, lien, place, weekly hours, 5/10/20 km) + real invite/accept consent (e2e stubs `/alerts`)
- Owner inbox page: empty state has no invented ideas; secret required
- Onboarding: avatar picker before geo; About readable without the consent sheet
- Transparency: footer trust pages, shipped `APP_VERSION`, public OPC email / GitHub
- Connect is visible; the suite does **not** open WalletConnect (no project id required)
- Mon profil: local registration (OPC-XXXX) stays in `localStorage`; first name (not email) appears next to the logo
- Reload: avatar, profile, and Vos idées restore for that device; home skips the picker and does not auto-play welcome

CI: `.github/workflows/build.yml` runs unit + functional on every PR/`main` push, and Playwright after `npm run build`.

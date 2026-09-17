# Partner / ad outreach shortlist (soft-launch)

**Status:** UI placeholders only on Accueil (**Nouvelles du Quartier**). No signed contracts, no claim of live ad revenue. Creatives are data in `src/lib/partner-ads.ts` (`PLACEHOLDER_PARTNERS`: `{ id, kind, href, imagePath? }` plus optional `name` / `tagline` / `cta` overrides). Soft-launch house ads push **S’inscrire / Mes infos** (`/mon-profil`) and **Partager / inviter** (`/mon-profil/inviter`). Swap in real partners without rewriting layout.

**Inventory today:** labeled **Publicité · Espace partenaire** mid + bottom slots, rotating house ads (register / share / local / **Place en garderie du quartier** / **Chambre à Gatineau Centre** flyer). Each published first-party image offers **Télécharger** (blob download; iOS Share / long-press fallback). Visitors can publish a photo from **Faites connaître votre business par des pubs** (`/business`): hard cap **400 Ko**, client-side compress, stored only on-device (`xsnow.visitorPartnerAds`). Env: `NEXT_PUBLIC_ADS_*` / AdSense slot IDs in `.env.example`. AdSense units are third-party and have no download control.

This note is public research for the owner. Contact only after the product owner decides; do not invent agreements.

---

## How to plug a real creative

1. Add or replace an entry in `PLACEHOLDER_PARTNERS` (keep `id` stable if possible).
2. Drop art under `public/partners/` and set `imagePath` (e.g. `/partners/coop.svg`).
3. Set `href` to the partner landing URL (https or in-app path). House-ad kinds `register` / `share` / `local` / `garderie` / `chambre` resolve FR/EN/ES copy automatically.
4. Optional: set `NEXT_PUBLIC_ADS_PROVIDER=adsense` + client/slot env when an AdSense/Ad Manager unit is approved.

Visitors save the creative with **Télécharger** on Accueil. Same-origin files use `<a download>` plus a blob fetch. iOS Safari often ignores `download`: the app uses the share sheet (Enregistrer l’image) when `canShare({ files })` is true, otherwise opens the image for a long-press save. Growth CTAs (S’inscrire / Partager) stay on the creative itself.

Visitor photos: max **400 KB** after on-device JPEG compress/resize. Oversize or non-image files are rejected in French (and EN/ES). Nothing is uploaded to a CDN.

---

## Shortlist (Canada / Québec / Gatineau–Outaouais)

### 1. Google AdSense / Google Ad Manager
- **URLs:** [AdSense](https://www.google.com/adsense/) · [Ad Manager](https://admanager.google.com/) · [AdSense vs Ad Manager vs AdMob](https://support.google.com/adsense/answer/9234653)
- **Why:** Default path for a small community web app (PWA). AdSense = automated fill; Ad Manager when direct-sold or multi-network later; AdMob if a native shell appears.
- **Next step:** Owner creates a Google publisher account, adds the Pages domain, waits for policy review. Map approved unit IDs to `NEXT_PUBLIC_ADSENSE_*` already wired in code.

### 2. Criteo (Commerce Media / Direct Bidder)
- **URLs:** [Criteo](https://www.criteo.com/) · [Publisher / Prebid docs](https://publisherdocs.criteotilt.com/prebid/)
- **Why:** Extra demand via Prebid or Ad Manager once traffic exists; strong retail/commerce advertisers useful for local “services & shops” framing.
- **Next step:** After ~stable Accueil traffic, ask Criteo publisher sales (or an SSP that already includes Criteo) about Direct Bidder / header-bidding for Canada. Do not integrate SDK until a live deal exists.

### 3. Le Droit / Les Coops de l’information (Outaouais)
- **URLs:** [Le Droit — nous joindre](https://www.ledroit.com/pages/nous-joindre/) · [Les Coops publicité](https://publicite.lescoops.ca/en/contact/) · [Media kits](https://publicite.lescoops.ca/en/download/) · national rep [Fuel Digital Media](https://www.fueldigitalmedia.com/) (also listed on Les Coops contact)
- **Why:** Flagship French daily for Ottawa–Gatineau. Direct local display / sponsorship conversations fit neighborhood news better than pure open exchange.
- **Next step:** Owner emails local publicité (Les Coops form or Le Droit local ads contact) describing OPC as a Gatineau–Outaouais community app seeking **cross-promo or house ads**, not inventing a buy. Request Fall media kit (Le Droit market). National buys go via Fuel.

### 4. m32 / self-serve local publisher tools
- **URL:** [Le Droit on m32ads](https://m32ads.com/sites/le-droit/)
- **Why:** Shows how regional publishers package display (e.g. 300×250) with modest daily budgets — useful reference when pricing or mirroring formats in our slots.
- **Next step:** Use as a format/rate benchmark; outreach still via Le Droit / Les Coops, not by claiming we are on m32.

### 5. MediaTonik (Québec multiplatform network)
- **URLs:** [MediaTonik](https://www.mediatonik.ca/home) · [AdStack / monetization](https://mediatonik.tech/adstack/) · contact `info@mediatonik.ca`
- **Why:** Montréal-based network monetizing premium Canadian publishers (direct + programmatic). Possible path if OPC grows inventory and wants managed yield without building sales alone.
- **Next step:** Owner sends a short “emerging community publisher — Québec audience” intro asking about **publisher onboarding** thresholds (traffic, brand safety).

### 6. NÜ (programmatic Québec / Canada)
- **URLs:** [NÜ inventory](https://nuprogrammatique.com/en/the-nu-approach/ad-inventory/) · [NÜ Optima](https://nuprogrammatique.com/en/nu-optima/)
- **Why:** Agency-side access to premium Québec/Canadian properties; useful later for **buying** awareness or understanding local programmatic norms. Not a direct fill network for a brand-new app day one.
- **Next step:** Skip until there is budget for awareness or a media partner introduction; keep as market map.

### 7. Cogeco Média / 104.7 Outaouais (+ Force Radio)
- **URLs:** [Cogeco Média](https://www.cogecomedia.com/en) · sales `infoventes@cogecomedia.com` · [104.7 Outaouais — IAB Canada listing](https://iabcanada.com/fr/directory-medias/listing/fm-104-7-outaouais/) · [Cogeco Force Radio](https://cogecoforceradio.com/)
- **Why:** Local radio + digital (banners, mobile, native, audio) rooted in Gatineau–Outaouais. Strong for reciprocal promo (app mention ↔ digital banner) with neighbourhood services.
- **Next step:** Owner contacts Cogeco Média sales / 104.7 with a one-pager: soft-launch Accueil slots, French community positioning, ask for digital/radio package options — no invented IO.

### 8. IAB Canada (directory / standards)
- **URL:** [IAB Canada media directory](https://iabcanada.com/)
- **Why:** Industry map of Canadian digital sellers and formats; helps vet networks and privacy/consent expectations (important for Québec Law 25).
- **Next step:** Owner browses directory for additional Outaouais/Québec sellers before expanding beyond this shortlist.

---

## Suggested outreach order

1. **Google AdSense** — technical path already stubbed (`adsense` provider).
2. **Le Droit / Les Coops** + **104.7 / Cogeco** — local credibility and possible house creatives.
3. **MediaTonik** — if monthly active usage justifies managed monetization.
4. **Criteo / Ad Manager stack** — once traffic and consent UX are solid.

Keep every Accueil creative clearly labeled sponsored; never mix partner copy into real neighbourhood headlines.

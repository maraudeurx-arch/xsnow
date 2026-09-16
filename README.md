# Xsnow / Open-Community

**Monétisé Vous!**

> Notre Proximité et notre esprit d’entraide est le gage de notre succès!

Application web communautaire (Next.js App Router + TypeScript + Tailwind), export statique, **HTTPS gratuit via GitHub Pages**.

## Site public (iPhone / Safari)

**https://maraudeurx-arch.github.io/xsnow/**

Visitor ideas and chat are untrusted plain text (never HTML, never git). Personal offers stay on-device until an approved numbered release. See **[SECURITY.md](SECURITY.md)** and `public/catalog/CHANGELOG.md`.

Chaque push sur `main` construit `out/` et le publie avec `.github/workflows/deploy-pages.yml`. Aucun serveur Node, aucun Vercel.

Si la page 404 juste après le merge : Settings → Pages → **Source = GitHub Actions**. Ou :

```bash
gh api --method POST /repos/maraudeurx-arch/xsnow/pages \
  -H "Accept: application/vnd.github+json" \
  -f build_type=workflow
```

**Connect** ouvre RainbowKit / WalletConnect (QR sur ordinateur, lien profond sur iPhone) dès qu’un identifiant projet Reown est fourni au build Pages. Sans identifiant, le bouton n’invente pas une session « Invité ».

---

## Français

### Qu’est-ce que c’est ?

Xsnow est la vitrine **Open-Community** : faire connaître un business, voir qui est à proximité, retrouver un téléphone perdu, et être alerté si un proche s’éloigne. Les premiers **services monétisables** : courses et livraison, aide au déménagement, garde d’enfants et d’animaux, prêt / emprunt d’objets avec caution. Un guide parlant invite à ouvrir **Accueil**. Avant la géolocalisation, le fond est l’automne nord-américain. Canada et USA gardent le calendrier à quatre saisons (`America/Toronto`) ; les autres régions passent à une ambiance statique (Caraïbes, Afrique, Europe, Asie, Amérique du Sud). `?season=winter|spring|summer|autumn` et `?region=caribbean|africa|europe|asia|southamerica` forcent un fond pour les tests.

### Interface

- En haut à gauche : **Xsnow**, puis **Accueil** (toutes les propositions à l’intérieur)
- En haut à droite : **Connect** (RainbowKit / WalletConnect, Ethereum principal + Base ; Sepolia en option)
- Titre centré : **Open-Community** / **Monétisé Vous!**
- Centre : avatar + bulle + **Réécouter** (`speechSynthesis`, iOS = tap)
- Safari iPhone : `viewport-fit=cover`, safe areas, cibles ~44 px

Aucun panneau Jeton / Outils. Les formulaires restent dans `localStorage`. La caution d’un prêt est un accord affiché, pas un vrai escrow.

### Démarrage local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrez [http://localhost:3000/xsnow/](http://localhost:3000/xsnow/) (`basePath` GitHub Pages).

```bash
npm run build
```

Le build écrit le site statique dans `out/`.

### Tests

Pyramide unitaire → fonctionnel → e2e (Playwright). Détail : [`docs/testing.md`](docs/testing.md).

```bash
npm test              # Node, lib + flux (sans navigateur)
npm run build         # export statique dans out/
npx playwright install chromium
npm run test:e2e      # smoke iPhone 390×844 sur out/ via /xsnow/
```

### Connect / WalletConnect (Reown)

Sans `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` au moment de `npm run build`, **Connect** affiche un court message : la connexion n’est pas configurée. Il ne simule pas un portefeuille.

Pour la prod GitHub Pages, créer un projet **gratuit** puis passer l’id au workflow (aucune autre modification de code) :

1. Ouvrir [Reown Cloud](https://cloud.reown.com) (WalletConnect Cloud).
2. Créer un compte, **Create** un projet (ex. `xsnow` / Open Community).
3. Copier le **Project ID** (32 caractères hexadécimaux).
4. Dans le projet Reown : domaines autorisés au minimum  
   `https://maraudeurx-arch.github.io` et `http://localhost:3000`.
5. Sur GitHub : repo **xsnow** → **Settings → Secrets and variables → Actions → Variables → New repository variable**  
   - Nom : `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`  
   - Valeur : le Project ID  
   Un *secret* du même nom fonctionne aussi. L’id se retrouve dans le JS public ; une variable suffit.
6. Optionnel : variable `NEXT_PUBLIC_ENABLE_TESTNETS` = `true` (défaut) pour garder **Sepolia** en chaîne extra, sans l’exiger à la connexion. `false` retire Sepolia ; Ethereum principal et Base restent.
7. Redéployer : **Actions → Deploy GitHub Pages → Run workflow**, ou un push sur `main`.

Vérifier sur **iPhone Safari** : ouvrir https://maraudeurx-arch.github.io/xsnow/ → **Connect** → modal RainbowKit → WalletConnect (ou MetaMask / Rainbow / Trust) → approuver dans l’app (réseau **Ethereum** / Base, pas Sepolia-only) → le bouton affiche l’adresse tronquée. Si le portefeuille est sur un autre réseau, **Changer de réseau** ouvre le sélecteur RainbowKit.

En local : coller l’id dans `.env.local` (voir [`.env.example`](.env.example)) puis `npm run dev`.

### Variables d’environnement

Voir [`.env.example`](.env.example). `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` est **requis** pour un vrai Connect en production.

`NEXT_PUBLIC_CHAT_API_URL` : URL publique du Worker Cloudflare (`workers/xsnow-chat`). Inlinée au `npm run build` (export statique). Défaut si vide : `https://xsnow-chat.xsnowopc.workers.dev` (`CHAT_API_FALLBACK_URL` dans `src/lib/llm.ts`).

`NEXT_PUBLIC_GEO_API_URL` : `GET|POST /geo` sur le même Worker (`{ lat, lon }` → `{ city, countryCode, localeHint }`). Si le Worker n’est pas encore redéployé, le navigateur utilise BigDataCloud (sans clé). Secours : Gatineau, `fr-CA`.

`NEXT_PUBLIC_NEWS_API_URL` : `GET /news?city=&lang=&country=` sur le même Worker — manchettes Google News RSS (numérique/économie d’abord, puis local). Jamais de fausses nouvelles. L’Accueil cache le dernier bon résultat en localStorage/IndexedDB par ville. Chaque fetch a un délai (Worker puis proxy JSON CORS) : Accueil n’affiche plus « Chargement… » pour toujours. Si le Worker n’a pas encore `/news` (405), secours rss2json / XML, puis état vide ou erreur.

`NEXT_PUBLIC_ADS_ENABLED` / `NEXT_PUBLIC_ADS_PROVIDER` : espaces **Publicité / Espace partenaire** sous les manchettes (pas de fausses news). Défaut : placeholders (house ads **S’inscrire / Mes infos** et **Partager / inviter**). `adsense` + `NEXT_PUBLIC_ADSENSE_CLIENT` / `NEXT_PUBLIC_ADSENSE_SLOT_NEWS_*` pour brancher un réseau plus tard. `false` ou `provider=none` les cache.

### Chat avatar (Cloudflare Workers AI, sans login)

Le chat n’utilise **pas** Puter. Les visiteurs n’ont **aucun compte** à créer. Le navigateur envoie `POST` JSON `{ "system", "messages": [{ "role", "content" }] }` vers le Worker ; la réponse attendue est `{ "reply": "…" }` (le front accepte aussi un format type OpenAI `choices`).

CORS (liste blanche, jamais `*`) : `https://maraudeurx-arch.github.io`, `https://opencommunity.app`, `https://www.opencommunity.app`, et `localhost` / `127.0.0.1` en dev (`:3000` et `:4173`). Un autre Origin (ex. ub.io) ne reçoit pas `Access-Control-Allow-Origin` — le navigateur bloque le POST.

Déployer le Worker (compte Cloudflare + Workers AI) :

```bash
cd workers/xsnow-chat
npx wrangler login
npx wrangler deploy
```

Le Worker déployé est `https://xsnow-chat.xsnowopc.workers.dev`. Pour un autre compte, coller la nouvelle URL dans `NEXT_PUBLIC_CHAT_API_URL` (variable Actions du même nom) ou dans `CHAT_API_FALLBACK_URL`. Après un changement de Worker (`/geo`, `/news`, `/ideas` inclus), `npx wrangler deploy` depuis `workers/xsnow-chat`.

### Boîte d’idées (propriétaire) — e-mail requis

Les idées restent **sur l’appareil du visiteur**. La vraie boîte de Politzer, c’est **opencommunity.opc@gmail.com**.

1. Le visiteur envoie depuis **Vos idées**. L’app enregistre en local **puis** `POST` automatiquement une copie assainie (phrase, ville, date, numéro OPC si inscrit — pas de nom de famille ni téléphone) vers `https://xsnow-chat.xsnowopc.workers.dev/ideas` — **sans** `mailto:`, feuille de partage, Notification API, ni dialogue de permission. Hors ligne : l’idée reste ici ; message honnête si l’e-mail n’est pas parti. Le Worker doit autoriser l’Origin du site (`github.io` et `opencommunity.app`) sinon le navigateur bloque le POST (erreur « réseau »).
2. Une inscription locale (`Mon profil`) envoie aussi un avis (prénom, OPC-XXXX, e-mail visiteur, ville) via `POST /register`.
3. Secrets Worker (jamais dans git) :

```bash
cd workers/xsnow-chat
npx wrangler secret put RESEND_API_KEY      # obligatoire pour l’e-mail
npx wrangler secret put IDEAS_FROM_EMAIL    # optionnel ; From vérifié chez Resend. Défaut : beth.t@example.com
npx wrangler secret put IDEAS_OWNER_SECRET  # optionnel ; page de compilation
npx wrangler deploy
```

Le `To:` est **codé en dur** (`opencommunity.opc@gmail.com`) — un visiteur ne peut pas le rediriger. Resend exige un domaine d’envoi vérifié pour livrer vers Gmail (le From `beth.t@example.com` ne sert qu’aux tests Resend).

4. Compilation optionnelle (D1), si `IDEAS_OWNER_SECRET` est posé (détail : [`docs/owner-ideas.md`](docs/owner-ideas.md)) :
   - HTML : `https://xsnow-chat.xsnowopc.workers.dev/ideas?secret=…`
   - JSON : la même URL avec `&format=json`
   - Page app (non listée) : `/xsnow/proprietaire/idees/?secret=…`

Sans `RESEND_API_KEY`, `POST /ideas` répond `{ ok: true, emailed: false }` — le client affiche l’échec e-mail et garde la copie locale. La page vide n’invente **aucune** idée.

### Ville du visiteur (géolocalisation)

Après le choix d’avatar, un bandeau demandait la position. **Désormais, dès la première visite**, une feuille de consentement demande deux choix optionnels : position (nom de ville ; sinon Gatineau) et stats d’usage anonymes. Rien n’est envoyé au Worker `/stats` et le dialogue GPS du navigateur n’apparaît qu’après un **oui**. Les choix restent dans `localStorage` (`xsnow.geoConsent`, `xsnow.analyticsConsent`) et se changent dans **Mon profil → Réglages**. Pages **Vie privée** (`/vie-privee`) et **Conditions** (`/conditions`).

Le mot-drapeau en haut à gauche et le gentilé du pied de page suivent la ville (`Gatinois`, `New-Yorkais`, `habitants de …`). L’accueil parlé et le prompt système citent cette ville.

QA : `?city=New%20York` force New York (mot-drapeau **NEW YORK**, gentilé **New-Yorkais**). `?geo=prompt` réaffiche la demande de position. `?city=Port-au-Prince` affiche l’ambiance Caraïbes.

---

## English

### Public URL

**https://maraudeurx-arch.github.io/xsnow/**

Static Next.js export (`output: 'export'`, `basePath: '/xsnow'`). GitHub Actions publishes `out/` on every `main` push.

If Pages 404s, set **Settings → Pages → Source = GitHub Actions**, or run the `gh api` command above.

**Connect** needs a Reown / WalletConnect Cloud project id inlined at build time. Set the GitHub Actions variable `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (steps in French above), then redeploy. Without it, Connect explains that WalletConnect is not configured instead of faking a guest session.

On iPhone Safari: open the public URL → **Connect** → RainbowKit modal → WalletConnect or MetaMask / Rainbow / Trust → approve in the wallet app (Ethereum mainnet / Base; Sepolia is optional) → the button shows the truncated address. If the wallet is on an unsupported chain, **Switch network** opens RainbowKit’s chain picker.

### Local

```bash
npm install
npm run dev
```

Open http://localhost:3000/xsnow/ then `npm run build` (writes `out/`).

### Tests

Unit → functional → Playwright e2e. See [`docs/testing.md`](docs/testing.md).

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

### Avatar chat (Cloudflare Workers AI, no login)

Puter is gone. Visitors do not sign in. The browser `POST`s `{ "system", "messages" }` to the Worker in `workers/xsnow-chat` and reads `{ "reply" }` (OpenAI-style `choices` also work). CORS is an allowlist (never `*`): `https://maraudeurx-arch.github.io`, `https://opencommunity.app`, `https://www.opencommunity.app`, and local `localhost` / `127.0.0.1` (`:3000` and `:4173`). Other Origins get no `Access-Control-Allow-Origin`.

```bash
cd workers/xsnow-chat
npx wrangler login
npx wrangler deploy
```

Deployed Worker: `https://xsnow-chat.xsnowopc.workers.dev`. Override with `NEXT_PUBLIC_CHAT_API_URL` (GitHub Actions variable of the same name) or `CHAT_API_FALLBACK_URL` in `src/lib/llm.ts`. Redeploy after adding `/geo`, `/news`, `/ideas`, or `/register`.

### Owner idea inbox (email required)

Visitor ideas stay **on that device**. Politzer’s real inbox is **opencommunity.opc@gmail.com**.

1. Visitors submit **Your ideas**. The app stores locally **then** automatically `POST`s a sanitized copy (sentence, city, date, OPC number if registered — no last name or phone) to `https://xsnow-chat.xsnowopc.workers.dev/ideas` — **no** `mailto:`, share sheet, Notification API, or permission dialog. Offline: the idea stays here; the UI is honest if email did not go out. The Worker must allow the site Origin (`github.io` and `opencommunity.app`) or the browser blocks the POST as a network error.
2. Local registration (`My profile`) also `POST`s a notice (first name, OPC-XXXX, visitor email, city) to `/register`.
3. Worker secrets (never commit):

```bash
cd workers/xsnow-chat
npx wrangler secret put RESEND_API_KEY      # required to send mail
npx wrangler secret put IDEAS_FROM_EMAIL    # optional verified Resend From. Default: beth.t@example.com
npx wrangler secret put IDEAS_OWNER_SECRET  # optional compile page
npx wrangler deploy
```

`To:` is **hardcoded** (`opencommunity.opc@gmail.com`) — visitors cannot redirect it. Resend needs a verified sending domain to deliver to Gmail (`beth.t@example.com` is test-only).

4. Optional D1 compile page if `IDEAS_OWNER_SECRET` is set (see [`docs/owner-ideas.md`](docs/owner-ideas.md)):
   - HTML: `https://xsnow-chat.xsnowopc.workers.dev/ideas?secret=…`
   - JSON: same URL with `&format=json`
   - Unlisted app page: `/xsnow/proprietaire/idees/?secret=…`

Without `RESEND_API_KEY`, `POST /ideas` returns `{ ok: true, emailed: false }` — the client shows email failed and keeps the local copy. The empty inbox does **not** invent ideas.

### Visitor city

After the avatar pick, the home screen used to ask for geolocation immediately. **First visit now shows a consent sheet**: optional location (city branding; otherwise Gatineau) and optional anonymous usage stats. The browser GPS prompt and `/stats` posts run only after a yes. Choices live in `localStorage` (`xsnow.geoConsent`, `xsnow.analyticsConsent`) and can be changed in **My profile → Settings**. **Privacy** (`/vie-privee`) and **Terms** (`/conditions`).

QA: `?city=New%20York` mocks New York; `?geo=prompt` shows the permission card again. `?city=Port-au-Prince` shows the Caribbean ambiance. `?region=` and `?season=` force a backdrop.

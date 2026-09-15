# Xsnow / Open-Community

**Monétisé Vous!**

> Notre Proximité et notre esprit d’entraide est le gage de notre succès!

Application web communautaire (Next.js App Router + TypeScript + Tailwind), export statique, **HTTPS gratuit via GitHub Pages**.

## Site public (iPhone / Safari)

**https://maraudeurx-arch.github.io/xsnow/**

Chaque push sur `main` construit `out/` et le publie avec `.github/workflows/deploy-pages.yml`. Aucun serveur Node, aucun Vercel.

Si la page 404 juste après le merge : Settings → Pages → **Source = GitHub Actions**. Ou :

```bash
gh api --method POST /repos/maraudeurx-arch/xsnow/pages \
  -H "Accept: application/vnd.github+json" \
  -f build_type=workflow
```

WalletConnect n’est pas requis.

---

## Français

### Qu’est-ce que c’est ?

Xsnow est la vitrine **Open-Community** : faire connaître un business, voir qui est à proximité, retrouver un téléphone perdu, et être alerté si un proche s’éloigne. Les premiers **services monétisables** : courses et livraison, aide au déménagement, garde d’enfants et d’animaux, prêt / emprunt d’objets avec caution. Un guide parlant invite à ouvrir **Accueil**. Le fond saisonnier (neige, pétales, lucioles, feuilles) suit le calendrier America/Toronto ; `?season=winter|spring|summer|autumn` force une saison pour les tests.

### Interface

- En haut à gauche : **Xsnow**, puis **Accueil** (toutes les propositions à l’intérieur)
- En haut à droite : **Connect** (RainbowKit/wagmi Sepolia, ou invité)
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

### Variables d’environnement

Voir [`.env.example`](.env.example). `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` est optionnel.

`NEXT_PUBLIC_CHAT_API_URL` : URL publique du Worker Cloudflare (`workers/xsnow-chat`). Inlinée au `npm run build` (export statique). Défaut si vide : `https://xsnow-chat.xsnowopc.workers.dev` (`CHAT_API_FALLBACK_URL` dans `src/lib/llm.ts`).

`NEXT_PUBLIC_GEO_API_URL` : `GET|POST /geo` sur le même Worker (`{ lat, lon }` → `{ city, countryCode, localeHint }`). Si le Worker n’est pas encore redéployé, le navigateur utilise BigDataCloud (sans clé). Secours : Gatineau, `fr-CA`.

### Chat avatar (Cloudflare Workers AI, sans login)

Le chat n’utilise **pas** Puter. Les visiteurs n’ont **aucun compte** à créer. Le navigateur envoie `POST` JSON `{ "system", "messages": [{ "role", "content" }] }` vers le Worker ; la réponse attendue est `{ "reply": "…" }` (le front accepte aussi un format type OpenAI `choices`).

CORS autorise `https://maraudeurx-arch.github.io` (et `localhost` en dev).

Déployer le Worker (compte Cloudflare + Workers AI) :

```bash
cd workers/xsnow-chat
npx wrangler login
npx wrangler deploy
```

Le Worker déployé est `https://xsnow-chat.xsnowopc.workers.dev`. Pour un autre compte, coller la nouvelle URL dans `NEXT_PUBLIC_CHAT_API_URL` (variable Actions du même nom) ou dans `CHAT_API_FALLBACK_URL`. Après un changement de Worker (`/geo` inclus), `npx wrangler deploy` depuis `workers/xsnow-chat`.

### Ville du visiteur (géolocalisation)

Après le choix d’avatar, un bandeau demandait la position. **Désormais, dès la première visite**, une feuille de consentement demande deux choix optionnels : position (nom de ville ; sinon Gatineau) et stats d’usage anonymes. Rien n’est envoyé au Worker `/stats` et le dialogue GPS du navigateur n’apparaît qu’après un **oui**. Les choix restent dans `localStorage` (`xsnow.geoConsent`, `xsnow.analyticsConsent`) et se changent dans **Mon profil → Réglages**. Pages **Vie privée** (`/vie-privee`) et **Conditions** (`/conditions`).

Le mot-drapeau en haut à gauche et le gentilé du pied de page suivent la ville (`Gatinois`, `New-Yorkais`, `habitants de …`). L’accueil parlé et le prompt système citent cette ville.

QA : `?city=New%20York` force New York (mot-drapeau **NEW YORK**, gentilé **New-Yorkais**). `?geo=prompt` réaffiche la demande de position.

---

## English

### Public URL

**https://maraudeurx-arch.github.io/xsnow/**

Static Next.js export (`output: 'export'`, `basePath: '/xsnow'`). GitHub Actions publishes `out/` on every `main` push.

If Pages 404s, set **Settings → Pages → Source = GitHub Actions**, or run the `gh api` command above.

### Local

```bash
npm install
npm run dev
```

Open http://localhost:3000/xsnow/ then `npm run build` (writes `out/`).

### Avatar chat (Cloudflare Workers AI, no login)

Puter is gone. Visitors do not sign in. The browser `POST`s `{ "system", "messages" }` to the Worker in `workers/xsnow-chat` and reads `{ "reply" }` (OpenAI-style `choices` also work). CORS allows `https://maraudeurx-arch.github.io`.

```bash
cd workers/xsnow-chat
npx wrangler login
npx wrangler deploy
```

Deployed Worker: `https://xsnow-chat.xsnowopc.workers.dev`. Override with `NEXT_PUBLIC_CHAT_API_URL` (GitHub Actions variable of the same name) or `CHAT_API_FALLBACK_URL` in `src/lib/llm.ts`. Redeploy after adding `/geo`.

### Visitor city

After the avatar pick, the home screen used to ask for geolocation immediately. **First visit now shows a consent sheet**: optional location (city branding; otherwise Gatineau) and optional anonymous usage stats. The browser GPS prompt and `/stats` posts run only after a yes. Choices live in `localStorage` (`xsnow.geoConsent`, `xsnow.analyticsConsent`) and can be changed in **My profile → Settings**. **Privacy** (`/vie-privee`) and **Terms** (`/conditions`).

QA: `?city=New%20York` mocks New York; `?geo=prompt` shows the permission card again.

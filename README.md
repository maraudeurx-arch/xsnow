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

**Connect** ouvre RainbowKit / WalletConnect (QR sur ordinateur, lien profond sur iPhone) dès qu’un identifiant projet Reown est fourni au build Pages. Sans identifiant, le bouton n’invente pas une session « Invité ».

---

## Français

### Qu’est-ce que c’est ?

Xsnow est la vitrine **Open-Community** : faire connaître un business, voir qui est à proximité, retrouver un téléphone perdu, et être alerté si un proche s’éloigne. Les premiers **services monétisables** : courses et livraison, aide au déménagement, garde d’enfants et d’animaux, prêt / emprunt d’objets avec caution. Un guide parlant invite à ouvrir **Accueil**. Le fond saisonnier (neige, pétales, lucioles, feuilles) suit le calendrier America/Toronto ; `?season=winter|spring|summer|autumn` force une saison pour les tests.

### Interface

- En haut à gauche : **Xsnow**, puis **Accueil** (toutes les propositions à l’intérieur)
- En haut à droite : **Connect** (RainbowKit / WalletConnect, réseau Sepolia)
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
6. Optionnel : variable `NEXT_PUBLIC_ENABLE_TESTNETS` = `true` (Sepolia, déjà le défaut).
7. Redéployer : **Actions → Deploy GitHub Pages → Run workflow**, ou un push sur `main`.

Vérifier sur **iPhone Safari** : ouvrir https://maraudeurx-arch.github.io/xsnow/ → **Connect** → modal RainbowKit → WalletConnect (ou MetaMask / Rainbow / Trust) → approuver dans l’app → le bouton affiche l’adresse. Réseau attendu : **Sepolia**.

En local : coller l’id dans `.env.local` (voir [`.env.example`](.env.example)) puis `npm run dev`.

### Variables d’environnement

Voir [`.env.example`](.env.example). `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` est **requis** pour un vrai Connect en production.

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

**Connect** needs a Reown / WalletConnect Cloud project id inlined at build time. Set the GitHub Actions variable `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (steps in French above), then redeploy. Without it, Connect explains that WalletConnect is not configured instead of faking a guest session.

On iPhone Safari: open the public URL → **Connect** → RainbowKit modal → WalletConnect or MetaMask / Rainbow / Trust → approve in the wallet app → the button shows the address (Sepolia).

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

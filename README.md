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

Xsnow est la vitrine **Open-Community** : faire connaître un business, voir qui est à proximité, retrouver un téléphone perdu, et être alerté si un proche s’éloigne. Les premiers **services monétisables** : courses et livraison, aide au déménagement, garde d’enfants et d’animaux, prêt / emprunt d’objets avec caution. Un guide parlant invite à ouvrir **Accueil**. Le filigrane **EN CONSTRUCTION** rappelle que le produit est encore en chantier.

### Interface

- En haut à gauche : **Xsnow**, puis **Accueil** (toutes les propositions à l’intérieur)
- En haut à droite : **Connect** (RainbowKit/wagmi Sepolia, ou invité)
- Titre centré : **Open-Community** / **Monétisé Vous!**
- Centre : avatar + bulle + **Réécouter** (`speechSynthesis`, iOS = tap)
- Filigrane diagonal `pointer-events: none`
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

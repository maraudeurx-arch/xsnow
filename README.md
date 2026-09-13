# Xsnow / Open-Community

**Monétisé Vous!**

> Notre Proximité et notre esprit d’entraide est le gage de notre succès!

Application web communautaire (Next.js App Router + TypeScript + Tailwind) prête pour un déploiement gratuit sur **Vercel Hobby**.

## Ouvrir sur iPhone (HTTPS gratuit)

Aucun add-on payant. Un compte [Vercel Hobby](https://vercel.com/signup) suffit.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/import?s=https://github.com/maraudeurx-arch/xsnow)

**Un clic :** [Importer ce dépôt sur Vercel](https://vercel.com/new/import?s=https://github.com/maraudeurx-arch/xsnow)

1. Connectez GitHub si Vercel le demande.
2. Projet : `maraudeurx-arch/xsnow`. Framework : **Next.js**. Build : `npm run build`.
3. Tant que le [PR #1](https://github.com/maraudeurx-arch/xsnow/pull/1) n’est pas fusionné, déployez la branche `cursor/xsnow-open-community-ebda` (`main` n’a encore que le README).
4. Après **Deploy**, Vercel donne `https://….vercel.app` — ouvrez-le dans Safari iPhone.
5. Optionnel : fusionnez le PR, puis laissez Vercel republier `main`.

WalletConnect n’est pas requis pour le premier HTTPS.

---

## Français

### Qu’est-ce que c’est ?

Xsnow est la vitrine **Open-Community** : faire connaître un business, voir qui est à proximité, retrouver un téléphone perdu, et être alerté si un proche s’éloigne de la zone où il doit être. Les premiers **services monétisables** sont ouverts : courses et livraison, aide au déménagement, garde d’enfants et d’animaux, prêt / emprunt d’objets avec caution. Un guide parlant invite à choisir un menu. Le filigrane **EN CONSTRUCTION** rappelle que le produit est encore en chantier.

### Fonctions de l’interface

- En haut à gauche : **Xsnow** + menu de proximité
- En haut à droite : bouton **Connect** (portefeuille Sepolia via RainbowKit/wagmi, ou mode invité si aucun Project ID)
- Au centre : **Open-Community** et le slogan **Monétisé Vous!**
- **Accueil** seul ; un tap révèle Reportage, Séries TV, Dessins animés, Vos attributs
- Guide Pixar-like, bulle en français, `speechSynthesis` + **Réécouter** (geste utilisateur, compatible iOS)
- Filigrane diagonal `pointer-events: none`
- Safari iPhone : `viewport-fit=cover`, safe areas, cibles ~44 px

Aucun panneau Jeton / Outils.

Les formulaires (business, téléphone, alertes, attributs, **services**) s’enregistrent dans `localStorage` — aucun backend payant. La caution d’un prêt est un accord affiché, pas un vrai escrow.

### Démarrage local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

### Variables d’environnement

Voir [`.env.example`](.env.example).

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Non | Active RainbowKit + WalletConnect (Sepolia). Sans cette clé, **Connect** bascule en mode invité local. |
| `NEXT_PUBLIC_ENABLE_TESTNETS` | Non | Rappel UI que le réseau attendu est Sepolia. |

Créez un identifiant gratuit : [cloud.walletconnect.com](https://cloud.walletconnect.com).

### Déployer gratuitement sur Vercel Hobby

[Importer `maraudeurx-arch/xsnow`](https://vercel.com/new/import?s=https://github.com/maraudeurx-arch/xsnow) → Deploy. Voir aussi le bouton en haut de ce README.

---

## English

### What is this?

**Xsnow / Open-Community** is a neighborhood dApp shell: list a business, see who is nearby, report a lost phone, get alerted if a family member leaves a trusted place, and publish the first monetizable neighbor services (grocery runs, moving help, childcare/pet sitting, lend/borrow with collateral). A talking guide invites a menu choice. A diagonal **EN CONSTRUCTION** watermark marks the work-in-progress release.

### UI chrome

- Top-left **Xsnow** + proximity menu
- Top-right **Connect** (RainbowKit/wagmi on Sepolia, or a local guest stub)
- Centered **Open-Community** and slogan **Monétisé Vous!**
- **Accueil** alone; tap to reveal Reportage, TV series, cartoons, attributes
- Pixar-like guide, French speech bubble, `speechSynthesis` + **Réécouter** (iOS user-gesture safe)
- Watermark with `pointer-events: none`
- iPhone Safari: `viewport-fit=cover`, safe areas, ~44 px tap targets

No Jeton/Outils panels. Forms persist in `localStorage` only. Lending collateral is recorded as an agreement — no payment processor in v1.

### Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Production check:

```bash
npm run build
npm start
```

### Environment

See [`.env.example`](.env.example). WalletConnect is optional. Without `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, Connect stays a Sepolia guest stub so Hobby deploys stay free and secret-less.

### Free Vercel Hobby deploy (iPhone HTTPS)

One click: [Import this GitHub repo on Vercel](https://vercel.com/new/import?s=https://github.com/maraudeurx-arch/xsnow). Hobby plan, Next.js defaults, no paid add-ons. Until PR #1 is merged, deploy branch `cursor/xsnow-open-community-ebda` — `main` is still the seed README. The live URL will look like `https://….vercel.app`. WalletConnect is optional.

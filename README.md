# Xsnow / Open-Community

**Monétisé Vous!**

> Notre Proximité et notre esprit d’entraide est le gage de notre succès!

Application web communautaire (Next.js App Router + TypeScript + Tailwind) prête pour un déploiement gratuit sur **Vercel Hobby**.

---

## Français

### Qu’est-ce que c’est ?

Xsnow est la vitrine **Open-Community** : faire connaître un business, voir qui est à proximité, retrouver un téléphone perdu, et être alerté si un proche s’éloigne de la zone où il doit être. Un guide parlant invite à choisir un menu. Le filigrane **EN CONSTRUCTION** rappelle que le produit est encore en chantier.

### Fonctions de l’interface

- En haut à gauche : **Xsnow** + menu de proximité
- En haut à droite : bouton **Connect** (portefeuille Sepolia via RainbowKit/wagmi, ou mode invité si aucun Project ID)
- Au centre : **Open-Community** et le slogan **Monétisé Vous!**
- **Accueil** seul ; un tap révèle Reportage, Séries TV, Dessins animés, Vos attributs
- Guide Pixar-like, bulle en français, `speechSynthesis` + **Réécouter** (geste utilisateur, compatible iOS)
- Filigrane diagonal `pointer-events: none`
- Safari iPhone : `viewport-fit=cover`, safe areas, cibles ~44 px

Aucun panneau Jeton / Outils.

Les formulaires (business, téléphone, alertes, attributs) s’enregistrent dans `localStorage` — aucun backend payant.

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

1. Poussez ce dépôt sur GitHub.
2. Importez-le sur [vercel.com](https://vercel.com) (compte Hobby).
3. Framework preset : **Next.js**. Build : `npm run build`. Output : défaut.
4. Ajoutez `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` si vous voulez le vrai Connect.
5. Deploy. Aucun add-on payant n’est requis.

---

## English

### What is this?

**Xsnow / Open-Community** is a neighborhood dApp shell: list a business, see who is nearby, report a lost phone, and get alerted if a family member leaves a trusted place. A talking guide invites a menu choice. A diagonal **EN CONSTRUCTION** watermark marks the work-in-progress release.

### UI chrome

- Top-left **Xsnow** + proximity menu
- Top-right **Connect** (RainbowKit/wagmi on Sepolia, or a local guest stub)
- Centered **Open-Community** and slogan **Monétisé Vous!**
- **Accueil** alone; tap to reveal Reportage, TV series, cartoons, attributes
- Pixar-like guide, French speech bubble, `speechSynthesis` + **Réécouter** (iOS user-gesture safe)
- Watermark with `pointer-events: none`
- iPhone Safari: `viewport-fit=cover`, safe areas, ~44 px tap targets

No Jeton/Outils panels. Forms persist in `localStorage` only.

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

### Free Vercel Hobby deploy

Import the GitHub repo in Vercel, keep the Next.js defaults, optionally set the WalletConnect project id, deploy. No paid add-ons.

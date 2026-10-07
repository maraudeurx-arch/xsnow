# Tutorat — note d’architecture (B0)

## Vue d’ensemble
Le client est un site statique (export Next.js, App Router). Il ne contient aucune logique serveur, aucun secret et n’écrit rien en base. L’API est un service séparé : un Worker indépendant avec sa propre base de données, à venir en B1. Le client se contente d’appeler cette API.

## Drapeau `NEXT_PUBLIC_TUTORAT=1`
La page vit dans `src/app/tutorat/page.tutorat.tsx`. Next ne la route que si l’extension `tutorat.tsx` est enregistrée dans `pageExtensions`, ce que la configuration ajoute uniquement quand le drapeau vaut `1` au moment du build. Sans le drapeau, `/tutorat` est absent de l’export statique. La page est `noindex`/`nofollow`, absente des menus et absente du sitemap (le site n’en a pas aujourd’hui ; un test le vérifie s’il apparaît). Build local de l’aperçu : `NEXT_PUBLIC_TUTORAT=1 npm run build`.

## Rôles
- **Apprenant (`learner`)** : réserve des créneaux et ne voit que ses propres séances.
- **Tuteur (`tutor`)** : publie ses créneaux (après approbation) et ne voit que les séances qui lui sont attribuées.
- **Admin (`admin`)** : approuve les tuteurs, peut suspendre un compte (par ex. signalé comme mineur) ; chaque accès admin est journalisé.

Toute tentative de lire la ressource d’un autre utilisateur est refusée (403).

La propriété des ressources est contrôlée par l’API : le client n’est jamais l’autorité.

## Barrière d’âge
La plateforme est réservée aux 18 ans et plus. Le contrôle est effectué par le serveur (B2), pas seulement par le client. Aucune table enfant/parent n’est prévue.

## Vidéo
Tout passe par l’interface `VideoProvider` :
- côté serveur : `createRoom`, `getJoinToken`, `startRecording` ;
- côté client : `join`, `setAudioOnly`, `leave`, et les événements `networkQuality` et `disconnected`.

Le fournisseur est branché derrière l’interface ; sa clé n’existe que côté serveur. L’audio est prioritaire pour les connexions faibles.

## Prochaines étapes
- **B1** : API et schéma de données.
- **B2** : authentification sans mot de passe, rôles et barrière 18+.

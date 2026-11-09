# Banque d'images et de voix — API pour l'application Jumeau (Starks)

> État au 09/11/2026 · PR #244 (`opc/banque-jumeau-voix-image`) · **mode test seulement : rien n'est jamais prélevé ni versé.**
> Code : `workers/xsnow-chat/src/persona-bank.ts` · logique partagée : `src/lib/twin-bank.ts`, `src/lib/twin-safety.ts` · migrations D1 `0016`, `0017`.
> Droit applicable : Ontario + fédéral (LPRPDE). Jamais le droit du Québec.

## 1. Base, formats, règles communes

- Base : l'URL du Worker `xsnow-chat` (la même que le chat d'OPC, `NEXT_PUBLIC_CHAT_API`).
- JSON UTF-8 partout (sauf le dépôt prêteur, en multipart). Réponses `Cache-Control: no-store`.
- Sans le bucket R2 `PERSONA_BANK` ou la base D1 : **toutes** les routes répondent `503 {"error":"storage_not_configured"}`. Ne jamais afficher de faux succès.
- Limite de débit par IP (comme le reste du Worker) → `429 rate_limited`.
- Montants en **cents CAD, avant taxes**.

### Tarif (base de travail adoptée le 09/11)
3,00 $ CA par voix ou image empruntée, par mois civil, ajoutés à l'abonnement Jumeau (Créateur 9 $ / Pro 29 $).
Partage 60 % prêteur / 30 % OPC / 10 % plateforme ; part du prêteur libérée 30 jours après la fin du mois (période de remboursement).
Orientation de Popol ; tarif final fixé par Indiana. **`TWIN_BANK_LIVE_BILLING = false`** : il faut l'OK écrit de Popol et une vraie étape de paiement pour l'ouvrir.
Note : ce partage remplace le 70/30 du cahier Jumeau v1.1 § 7.8, qui est à mettre à jour.

## 2. Identité de l'abonné Jumeau

Deux modes :

| Mode | Qui appelle | Identifiant | Quand |
|---|---|---|---|
| **Compte lié (réel)** | le **serveur** de l'app Jumeau, en-tête `Authorization: Bearer <TWIN_APP_SECRET>` | `subscriberId` rendu par `POST /twin-bank/subscribers` | dès que l'app Jumeau a de vrais comptes |
| **Test** | un navigateur (page `/jumeau-banque` d'OPC, testeurs du jeudi 12/11) | `sub-` + 8 à 40 caractères `[a-z0-9]`, tiré au hasard et gardé sur l'appareil | seulement si `TWIN_BANK_TEST_MODE="on"` |

- Le secret `TWIN_APP_SECRET` ne va **jamais** dans un navigateur ni dans l'app mobile : seulement sur le serveur Jumeau.
- Un `subscriberId` lié ne peut pas être utilisé sans le secret (`401 app_auth_required`) : on ne peut pas usurper un abonné.
- Avec `TWIN_BANK_TEST_MODE="off"`, les identifiants de test sont refusés (`401 app_auth_required`).
- La banque est réservée aux paliers payants (cahier § 7.1). Un compte « Découverte » reçoit `402 tier_required`.

### `POST /twin-bank/subscribers` — lier un compte Jumeau
En-tête `Authorization: Bearer <TWIN_APP_SECRET>`.
```json
{ "twinAccountId": "id-interne-du-compte", "tier": "decouverte" | "createur" | "pro" }
```
→ `200`
```json
{ "ok": true, "subscriberId": "sub-<32 hex>", "tier": "pro", "bankAccess": true, "suspended": false }
```
- Le `subscriberId` est stable pour un même compte (HMAC du compte). OPC ne garde que l'empreinte SHA-256 de `twinAccountId`, jamais l'identifiant en clair.
- Rappeler cette route à chaque changement de palier (montée, baisse, résiliation → `decouverte`).
- Erreurs : `401 unauthorized`, `400 bad_request`, `503 not_configured` (secret non posé).

## 3. Catalogue et usage

### `GET /twin-bank` — catalogue
Ne contient que des dossiers **consentis, non retirés, avec média présent**. Les dossiers vérifiés par l'équipe ont `verified:true`. En mode test, les dossiers encore en revue apparaissent aussi, avec `verified:false`.
```json
{ "ok": true,
  "items": [{ "id": "persona-…", "pseudonym": "Joase", "country": "Haïti", "kinds": ["voice","image"], "verified": false }],
  "pricing": { "perItemPerMonthCadCents": 300, "beforeTaxes": true, "liveBilling": false, "testMode": true } }
```
Aucune URL de média dans le catalogue. L'app doit **afficher le coût avant tout usage**.

### `POST /twin-bank/use` — inscrire un usage (mode test)
```json
{ "subscriberId": "sub-…", "itemId": "persona-…", "kind": "voice" | "image",
  "acceptCost": true, "acceptRules": true }
```
`acceptCost` et `acceptRules` doivent venir de deux cases cochées par la personne (coût affiché ; usage marqué « généré par IA », jamais pour tromper ni pour du contenu sexuel, politique, haineux, frauduleux ou illégal).
→ `200`
```json
{ "ok": true, "testMode": true, "charged": false, "linked": true,
  "alreadyCountedThisMonth": false, "month": "2026-11", "monthTotalCadCents": 300, "lines": 1,
  "media": { "voice": "/twin-bank/media?item=…&asset=voice&sub=…&exp=…&sig=…" } }
```
- Une seule ligne par abonné × élément × type × mois : réutiliser le même élément dans le mois ne coûte rien de plus.
- `media` : liens signés HMAC, **valables 10 minutes**, liés à cet abonné. Pour une image : `image` (photo) + `video` (courte vidéo). La vidéo de vérification (selfie) n'est **jamais** servie.
- Si `charged` n'est pas `false`, le client doit traiter la réponse comme une erreur (garde-fou).
- Erreurs : `400 notice_not_accepted`, `404 not_available` (retiré, refusé ou absent), `401 app_auth_required`, `402 tier_required`, `404 subscriber_not_linked`, `423 subscriber_suspended`, `423 human_review_required`.

### `GET /twin-bank/usage?subscriberId=` — total du mois
```json
{ "ok": true, "testMode": true, "month": "2026-11",
  "lines": [{ "itemId": "persona-…", "kind": "voice", "amountCadCents": 300 }], "totalCadCents": 300 }
```

### `GET /twin-bank/media?item=&asset=&sub=&exp=&sig=`
Diffuse le fichier privé (R2). `403 forbidden` si la signature est fausse, expirée ou faite pour un autre abonné. `404` si le prêteur a retiré son dossier.

## 4. Avant chaque création : filtre, journal, étiquette « généré par IA »

### `POST /twin-bank/generate` — **obligatoire avant chaque génération**
```json
{ "subscriberId": "sub-…", "itemId": "persona-…", "kind": "voice" | "image",
  "prompt": "texte à dire / scène à montrer",
  "outputSha256": "<sha256 hex du fichier produit, facultatif>",
  "publishedUrl": "https://… (facultatif, lien publié)" }
```
1. **Filtre des usages interdits** (`twinPromptIssue`, listes FR/EN/ES) : sexuel, politique/électoral, usurpation (« c'est moi, X », faire croire que c'est la vraie personne, deepfake), arnaque/fraude (mots de passe, codes de vérification, virement urgent), haine/diffamation/harcèlement, contenu visant des mineurs, conseils santé/argent au nom du prêteur.
   Refus → `422 {"error":"banned_use","reason":"political","refusals":1,"humanReview":false}`. Le refus est journalisé (empreinte du texte seulement). **3 refus ouverts = revue humaine** : la banque répond ensuite `423 human_review_required` à cet abonné jusqu'à la décision de l'équipe.
   Texte vide → `422 {"error":"prompt_required"}` (non compté).
2. Il faut un **usage inscrit ce mois-ci** pour cet élément et ce type, sinon `402 use_required`.
3. Une ligne est ajoutée au **journal d'usage** (append-only, cahier § 7.5) : abonné, élément, empreinte SHA-256 du texte + résumé de 140 caractères, empreinte du fichier, lien publié, date.
4. Réponse `200` :
```json
{ "ok": true, "outputId": "out-<20 hex>", "aiGenerated": true,
  "label": {
    "visible": { "fr": "Contenu généré par IA — voix prêtée par Joase via OPC. …", "en": "…", "es": "…" },
    "audibleIntro": { "fr": "Cette voix est générée par intelligence artificielle.", "en": "…", "es": "…" },
    "mustDisplay": true },
  "youtube": { "syntheticContent": true },
  "provenance": { "format": "opc-twin-provenance/1", "claim_generator": "OPC Jumeau numérique / opencommunity.app",
    "outputId": "out-…", "createdAt": "2026-11-12T15:00:00.000Z",
    "assertions": [
      { "label": "c2pa.actions", "data": { "actions": [{ "action": "c2pa.created",
        "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia" }] } },
      { "label": "opc.twin.license", "data": { "licenseId": "persona-….voice.2026-11", "lender": "pr-<12 hex>", "kind": "voice", "aiGenerated": true } },
      { "label": "c2pa.hash.data", "data": { "alg": "sha256", "hash": "…" } } ] },
  "signature": "<HMAC-SHA256 base64url du JSON provenance>",
  "verifyUrl": "/twin-bank/provenance?id=out-…" }
```

**Obligations de l'app Jumeau (cahier § 7.4) :**
- afficher `label.visible` (langue de la personne) **à l'écran, en permanence** sur l'image ou la vidéo ;
- faire dire `label.audibleIntro` **au début** de tout audio ou vidéo ;
- au moment du rendu, **inscrire `provenance` dans le fichier** : manifeste C2PA (bibliothèque `c2pa-rs` / `c2pa-node`) avec l'action `c2pa.created` et `digitalSourceType = trainedAlgorithmicMedia`, plus les métadonnées XMP/IPTC `Iptc4xmpExt:DigitalSourceType` ;
- à la publication YouTube, cocher « contenu modifié ou synthétique » (`youtube.syntheticContent`).

Limite actuelle : la signature renvoyée est un HMAC d'OPC (vérifiable via `verifyUrl`), **pas** une signature C2PA X.509. Un manifeste C2PA signé « officiellement » demande un certificat de signature (coût et décision : voir § 7).

### `GET /twin-bank/provenance?id=out-…` — vérification publique
```json
{ "ok": true, "outputId": "out-…", "aiGenerated": true, "kind": "voice", "createdAt": 1762959600000,
  "lenderWithdrawn": false, "signatureValid": true, "provenance": { … } }
```
Après un retrait du prêteur, les anciennes étiquettes restent vérifiables (`lenderWithdrawn:true`) mais aucune nouvelle création n'est possible (`404 not_available`).

### `POST /twin-bank/report` — « Signaler un abus » (ouvert à tous)
```json
{ "outputId": "out-…", "reason": "texte libre (3 à 500 caractères)" }   // ou { "itemId": "persona-…", "reason": "…" }
```
→ `202 {"ok":true,"received":true,"suspendedPendingReview":true}`.
Quand le signalement vise une création, l'abonné en cause est **suspendu tout de suite** (`423 subscriber_suspended`) en attendant la revue de l'équipe (cahier § 7.7 : 24 h).

## 5. Côté prêteur (page OPC `/monetise`)

| Route | Rôle |
|---|---|
| `POST /persona-deposits` (multipart `meta` + `voice`/`image`/`video`/`selfie`) | dépôt avec consentement v `indiana-v1-2026-11-09` (18+, pays en développement, retrait, suppression réelle, usages interdits, aucun revenu garanti, sa propre voix/image) ; rend un `withdrawToken` (seule son empreinte est gardée) |
| `GET /persona-deposits/status?id=&token=` | état du dossier |
| `POST /persona-deposits/withdraw {id, token}` | **retrait immédiat** : fichiers effacés de R2, retiré du catalogue |
| `GET /persona-deposits/usage?id=&token=` | **journal d'usage** : qui (pseudonyme `abonne-xxxxxx` propre à chaque prêteur, jamais l'identifiant réel) a emprunté quoi, quand, les résumés des créations, la part prévue (mode test, rien n'est versé) |

## 6. Équipe (revue humaine) — `Authorization: Bearer <PERSONA_ADMIN_SECRET>`

- `GET /persona-bank/review` → dossiers en attente, `reports` (signalements ouverts), `subscribersToReview` (≥ 3 refus).
- `GET /persona-bank/review/media?id=&asset=` → écouter/voir un dossier.
- `POST /persona-bank/review` :
  - `{id, decision:"approve"|"reject"}` pour un dossier prêteur ;
  - `{subscriberId, decision:"suspend-subscriber"}` pour suspendre un abonné ;
  - `{subscriberId, decision:"clear-subscriber"}` pour lever la suspension et clore les refus après revue.

## 7. Déjà fait / à faire

Fait (PR #244) : consentement 18+, retrait avec suppression réelle, catalogue consenti, coût affiché, usage en mode test, liens signés, journal d'usage prêteur, filtre de base des usages interdits avec revue humaine à 3 refus, étiquette « généré par IA » FR/EN/ES + phrase audible + manifeste de provenance de style C2PA vérifiable, signalement avec suspension, liaison réelle des comptes Jumeau (paliers payants).

Reste à faire :
- **Starks** : appeler `/twin-bank/subscribers` à chaque création ou changement de palier ; appeler `/twin-bank/generate` avant chaque génération ; incruster l'étiquette visible et la phrase audible ; inscrire le manifeste C2PA dans le fichier ; aperçus filigranés dans le catalogue (cahier § 7.1).
- **Filtre** : la liste de mots est une première barrière ; ajouter le classificateur Llama (Workers AI) et les exclusions propres à chaque prêteur (cahier § 7.6).
- **Vérification** : la comparaison automatique visage ↔ selfie et la vérification du pays de résidence ne sont pas faites (revue humaine seulement).
- **Argent** : aucune facturation ni aucun versement réel. Il faut l'OK écrit de Popol, un compte de paiement et un moyen de versement (mobile money, USDC à faibles frais, virement local).
- **Certificat C2PA** (coût possible) et **revue d'un avocat** (Ontario + fédéral) avant l'ouverture au public.
- Conservation du journal d'usage : 3 ans (cahier § 7.5), avec purge à prévoir.

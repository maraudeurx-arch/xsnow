# Arbitrage HITL (Human-In-The-Loop)

Page `/arbitrage/` (bouton « Devenir arbitre » dans Gagner maintenant). Backend : Worker `xsnow-chat`, routes `/arbitrage/*` (voir `workers/xsnow-chat/src/arbitrage.ts`), D1 `xsnow-opc-stats`, Workers AI déjà lié.

## Flux
1. Profil OPC local → « Devenir arbitre » → avis de vie privée + case de consentement.
2. Nom, prénom, type de pièce, numéro, pays d’émission, date d’expiration, **une** photo de la pièce (compressée ≤ 400 Ko dans le navigateur).
3. Scan du visage dans le navigateur (@vladmandic/human, modèles auto-hébergés `/models/human/`) : tourner la tête gauche puis droite (vivacité), score de similarité avec la photo de la pièce. **Aucune image du visage n’est envoyée** : seulement `{score, liveness, method}`.
4. Statut `pending` → le propriétaire vérifie (`/arbitrage/admin/*`) → `verified`.
5. Arbitre vérifié : litiges ouverts, suggestion IA (Llama 3.2 3B via Workers AI, stub si indisponible), accepter ou refuser (raison + décision humaine obligatoires).
6. Les deux parties reçoivent un webhook HTTPS : décision, origine, attestation Ed25519 signée (id pseudonyme d’arbitre, niveau de vérification, horodatage, hash de l’identité + du résultat facial, réputation). Jamais la photo, le numéro, ni le nom. Clé publique : `GET /arbitrage/public-key`.

## Sécurité / rétention
- Identité et photo chiffrées AES-256-GCM dans D1 (`ARBITER_ENC_KEY`), lisibles seulement avec `ARBITER_ADMIN_SECRET`.
- Données brutes effacées 90 jours après la revue ; le hash reste pour vérifier les attestations.
- Aucun journal des champs d’identité.

## Mise en route (à faire par le propriétaire)
```bash
node scripts/arbitrage-keys.mjs            # ~/.config/opc-arbitrage/keys.env, mode 600, rien n’est affiché
cd workers/xsnow-chat
npx wrangler d1 migrations apply xsnow-opc-stats --remote
# pour chaque ligne du fichier (sans l’afficher) :
for k in ARBITER_ENC_KEY ARBITER_SIGNING_KEY ARBITER_SIGNING_PUBLIC_KEY ARBITER_ADMIN_SECRET; do
  grep "^$k=" ~/.config/opc-arbitrage/keys.env | cut -d= -f2- | npx wrangler secret put "$k"
done
npx wrangler deploy
```

## Revue admin (curl)
```bash
set -a; . ~/.config/opc-arbitrage/keys.env; set +a
W=https://xsnow-chat.xsnowopc.workers.dev
curl -s -H "Authorization: Bearer $ARBITER_ADMIN_SECRET" $W/arbitrage/admin/pending
curl -s -H "Authorization: Bearer $ARBITER_ADMIN_SECRET" "$W/arbitrage/admin/photo?id=arb_…"   # base64, ne pas journaliser
curl -s -X POST -H "Authorization: Bearer $ARBITER_ADMIN_SECRET" -H 'Content-Type: application/json' \
  -d '{"arbiterId":"arb_…","approve":true,"faceReviewed":true}' $W/arbitrage/admin/review
curl -s -X POST -H "Authorization: Bearer $ARBITER_ADMIN_SECRET" -H 'Content-Type: application/json' \
  -d '{"claimant":{"agentId":"A","webhookUrl":"https://…"},"respondent":{"agentId":"B","webhookUrl":"https://…"},"amountUsdc":500,"claim":"…","response":"…"}' \
  $W/arbitrage/admin/cases
```

## Limites honnêtes de la correspondance faciale
- Non certifiée KYC ; pas d’anti-usurpation réelle : une photo imprimée ou une vidéo rejouée peut passer le test « tourner la tête ».
- Score indicatif (seuil 0,55), sensible à la lumière, à la qualité de la photo de la pièce et aux lunettes ; taux d’erreur non mesurés sur nos données.
- Le score est calculé côté client : un utilisateur technique peut le falsifier. D’où la revue humaine obligatoire avant `verified`.

## Simulation de dossier (test only)

Purpose: check the arbiter flow end to end with fictitious cases, several arbiters at once.

- Migration `0004_arb_simulation.sql`: `arb_cases.simulation`, `arb_cases.choices_json`, table `arb_sim_answers` (PK `case_id, arbiter_id` → one answer per arbiter per case).
- Admin (Bearer `ARBITER_ADMIN_SECRET`):
  - `POST /arbitrage/admin/sim-cases` `{title, scenario, choices: [2..4 strings or {id,label}]}` → title is always prefixed `SIMULATION — `.
  - `GET /arbitrage/admin/sim-results` → per case: choices, tally, answers (arbiter id, choice, comment, time, response seconds). No identity data.
  - `POST /arbitrage/admin/sim-close` `{caseId}`.
- Verified arbiter: `GET /arbitrage/sim-cases`, `POST /arbitrage/sim-cases/answer` `{caseId, choiceId, comment?}` (409 if already answered).
- Simulation cases never appear in `/arbitrage/cases` and are refused by `/cases/decide`. No AI suggestion, no webhook, no signature, no reputation change, no email.
- Server-side text guard (title, scenario, choices): refuses `cour`, `court(s)`, `tribunal(aux)` and any money/percent figure except `30 $`, `50 $`, `10 %`. Describe disputed amounts in words.
- UI: `/arbitrage` shows a SIMULATION banner and radio choices under the real cases list.

Example:

```bash
curl -X POST "$API/arbitrage/admin/sim-cases" -H "Authorization: Bearer $ARBITER_ADMIN_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Fichier non livré","scenario":"L’agent A dit que B n’a pas livré.","choices":["Rembourser A","Donner raison à B","Partager"]}'
curl "$API/arbitrage/admin/sim-results" -H "Authorization: Bearer $ARBITER_ADMIN_SECRET"
```

## Rescan du visage (`rescan_requested`)

No migration: `arbiters.status` is TEXT.

- Admin: `POST /arbitrage/admin/review {arbiterId, action: "rescan"}` → status `rescan_requested` (from `pending`; 409 if rejected or identity was purged). Identity and ID photo are kept.
- **Arbitre déjà `verified`** (Popol, 23/10/2026): the same call only sets `rescan_requested_at` (migration 0014). Status, approval and access stay `verified`. `/arbitrage/me` returns `rescanRequested: true`, the app shows the face scan step, the checklist face item is open. `POST /arbitrage/rescan` stores the new score + liveness + hash, clears the flag, status stays `verified`. One shot.
- Candidate app (`/arbitrage`, same device/token): clear message, no identity form, only `FaceScan` (head turn left/right liveness, `playsinline` video for iOS Safari) against the ID photo on file.
  - `GET /arbitrage/rescan/photo` (own token, only in `rescan_requested`) returns the candidate's own ID photo for the in-browser match (no-store).
  - `POST /arbitrage/rescan {face:{score, liveness, method}}` updates the SAME application: new face result, `face_reviewed = 0`, `identity_hash` recomputed, status back to `pending`. One shot: another rescan needs a new admin request.

### Letters and Indiana's suggestion (simulation)

- Choices carry letters A–D by position (stored in `choices_json`; older cases get them at read time). Results tally by letter and give each answer's `letter`.
- Optional `suggestion: {letter, text, reasoning}` on `POST /arbitrage/admin/sim-cases`: static, admin-written ("Suggestion d'Indiana"), stored in `arb_cases.suggestion_json`, no AI call. Same text guard as the rest. Arbiters see it before answering.
- `sim-results` adds `suggestion`, `followedSuggestion` / `contradictedSuggestion` counts, and `followedSuggestion` per answer. No migration.

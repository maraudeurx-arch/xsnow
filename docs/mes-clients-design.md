# « Mes clients » — espace chef de projet (Clé en main) / Project-lead space

Statut : conception, pas de code. Validé par Popol le 4 nov. 2026.
Status: design only, no code. Approved by Popol on Nov 4, 2026.

## FR

**But.** Permettre aux chefs de projet inscrits sur OPC (souvent dans des pays en développement) de guider les clients Clé en main jusqu'à la réalisation de leur projet, sans seconde application ni seconde inscription.

**Phases.**
- Bêta (9–20 nov.) : assignation par courriel. Yves ou Indiana assigne chaque code `VIBE-CLE-XXXXXX` à un chef de projet, qui répond via un relais ; l'adresse du client reste masquée.
- Lancement (7 déc.) : espace « Mes clients » dans OPC.

**Fonctions (lancement).**
1. Connexion unique : le compte OPC Chef de projet existant.
2. File de projets : liste des codes assignés, état (nouveau / en cours / en attente client / terminé).
3. Fil par projet : messages texte et notes vocales (micro toujours accessible, Vibe Coding).
4. Liste d'étapes cochables par projet, visible aussi par le client.
5. Léger en données et hors ligne : brouillons et notes vocales mis en file, envoyés à la reconnexion ; audio compressé ; pas d'images lourdes.

**Vie privée.** Le chef de projet ne voit que le code, le prénom et la description du projet. Jamais l'adresse courriel, le téléphone ni le paiement. Les échanges passent par le relais. Cadre : LPRPDE et droit de l'Ontario, plus la loi du pays du client.

**Hors périmètre.** Paiement des chefs de projet, notation, assignation automatique (plus tard).

**Questions ouvertes.** Boîte de réception de contact@essaim-agents.com ; durée de conservation des notes vocales ; règle de réassignation si un chef de projet ne répond pas sous 48 h.

## EN

**Goal.** Let OPC-registered project leads (often in developing countries) guide Clé en main clients to project completion, with no second app and no second sign-up.

**Phases.**
- Beta (Nov 9–20): email assignment. Yves or Indiana assigns each `VIBE-CLE-XXXXXX` code to a lead, who replies through a relay; the client's email stays hidden.
- Launch (Dec 7): « Mes clients » space inside OPC.

**Features (launch).**
1. Single login: the existing OPC project-lead account.
2. Project queue: assigned codes with status (new / in progress / waiting on client / done).
3. Per-project thread: text messages and voice notes (mic always available, Vibe Coding).
4. Step checklist per project, also visible to the client.
5. Low-data and offline: drafts and voice notes queued and sent on reconnect; compressed audio; no heavy images.

**Privacy.** The lead sees only the code, first name and project description. Never email, phone or payment data. All exchanges go through the relay. Framework: PIPEDA (LPRPDE) and Ontario law, plus the client's country law.

**Out of scope.** Lead payouts, ratings, auto-assignment (later).

**Open questions.** Which inbox contact@essaim-agents.com forwards to; voice-note retention period; reassignment rule if a lead does not reply within 48 h.

## Décision : hébergement « option A » (Popol, 4 nov. 2026) / Decision: "option A" hosting

**FR —** Après discussion avec Indiana, Popol a retenu l'option A pour l'app Clé en main :
- Le code des projets qui en ont besoin est hébergé dans le compte GitHub/Vercel **d'Essaim-Agents**, un dossier (dépôt/projet) par client.
- Le nom de domaine est enregistré **au nom du client**. Le client ne crée aucun compte.
- Tout est transféré au client s'il part ou à la fin du projet, garanti par écrit. Si l'abonnement s'arrête : site en ligne 30 jours, puis transfert (ou suppression sur demande) — délai proposé, à confirmer.
- Inscription : prénom, nom, courriel, mot de passe propre à l'app (jamais celui du courriel, jamais réutilisé pour GitHub/Vercel). Carte : page de paiement hébergée (ex. Stripe), jamais saisie dans nos apps.
- Consentement explicite à l'inscription (FR/EN). Vie privée : LPRPDE et loi de l'Ontario.
- Impact « Mes clients » : le chef de projet voit le dossier du client via le compte Essaim-Agents (accès par projet, révocable), jamais les identifiants ni l'adresse du client.
- Option B (le client crée ses comptes via « Se connecter avec Google » et nous invite) : plus tard, pour les clients avancés.

**EN —** After discussion with Indiana, Popol chose option A: code hosted in Essaim-Agents' own GitHub/Vercel account, one folder per client; domain in the client's name; no client account; full transfer on exit or completion, guaranteed in writing; if the subscription stops, 30 days online then transfer (proposed, to confirm). App-only password; hosted checkout (e.g. Stripe), no card fields. PIPEDA (LPRPDE) and Ontario law. Option B later for advanced clients.

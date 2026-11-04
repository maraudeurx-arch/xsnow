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
- Tout est transféré au client s'il part ou à la fin du projet, garanti par écrit. Si l'abonnement s'arrête : site en ligne 30 jours, puis transfert (ou suppression sur demande) — délai confirmé par Popol le 4 novembre 2026.
- Inscription : prénom, nom, courriel, mot de passe propre à l'app (jamais celui du courriel, jamais réutilisé pour GitHub/Vercel). Carte : page de paiement hébergée (ex. Stripe), jamais saisie dans nos apps.
- Consentement explicite à l'inscription (FR/EN). Vie privée : LPRPDE et loi de l'Ontario.
- Impact « Mes clients » : le chef de projet voit le dossier du client via le compte Essaim-Agents (accès par projet, révocable), jamais les identifiants ni l'adresse du client.
- Option B (le client crée ses comptes via « Se connecter avec Google » et nous invite) : plus tard, pour les clients avancés.

**EN —** After discussion with Indiana, Popol chose option A: code hosted in Essaim-Agents' own GitHub/Vercel account, one folder per client; domain in the client's name; no client account; full transfer on exit or completion, guaranteed in writing; if the subscription stops, 30 days online then transfer (period confirmed by Popol on 4 November 2026). App-only password; hosted checkout (e.g. Stripe), no card fields. PIPEDA (LPRPDE) and Ontario law. Option B later for advanced clients.

## IA open source avec harnais, validation et escalade (Popol, 4 nov. 2026) / Harnessed open-source AI, validation and escalation

### FR
**Flux :** client (« Mon projet IA », micro) → IA open source nord-américaine sous harnais (ex. Llama 3.3 70B ou GPT-OSS 120B chez un hébergeur américain : Fireworks, AWS Bedrock, DeepInfra ; pas de DeepSeek) → le chef de projet OPC valide chaque demande et dirige l'IA → si blocage ou hors règles, escalade à l'équipe (Popol, Indiana, Yves) qui accepte ou refuse.

**Règles du harnais :** l'IA ne publie, ne déploie, ne dépense et ne contacte personne sans validation du chef de projet ; aucune action sur domaine, facturation, données personnelles ou suppression sans accord de l'équipe ; plafond de jetons par forfait ; contenu illégal, haineux ou trompeur refusé ; chaque action journalisée.

**File d'escalade :** demande créée par le harnais ou le chef de projet (motif, projet, action proposée) ; une approbation d'un membre de l'équipe suffit (donnée au nom de l'équipe de trois et journalisée), un refus est motivé ; délai visé 24 h ; sans réponse, l'action reste bloquée (jamais d'accord implicite).

**Accès :** une clé par projet, à portée limitée (ce projet seulement, révocable, plafonnée), détenue par le serveur, jamais montrée. Le chef de projet agit via son propre compte OPC, avec un rôle sur le projet assigné ; il ne voit ni le mot de passe, ni le courriel, ni la carte du client. La clé fournisseur IA reste côté serveur.

**Vie privée (LPRPDE et Ontario) :** consentement explicite avant envoi des propos du client à l'IA et au chef de projet hors Canada (communication transfrontalière annoncée) ; minimisation (pseudonyme au chef de projet) ; hébergeur sans entraînement sur les données ; accès et suppression sur demande ; responsable de la protection désigné ; avis d'atteinte au Commissaire en cas de fuite.

### EN
**Flow:** client ("Mon projet IA", mic) → harnessed North-American open-source AI (e.g. Llama 3.3 70B or GPT-OSS 120B on a US host: Fireworks, AWS Bedrock, DeepInfra; no DeepSeek) → the OPC project lead validates each request and directs the AI → if blocked or beyond the rules, escalation to the team (Popol, Indiana, Yves), who approve or refuse.

**Harness rules:** the AI never publishes, deploys, spends or contacts anyone without project-lead validation; no domain, billing, personal-data or deletion action without team approval; per-plan token cap; illegal, hateful or deceptive content refused; every action logged.

**Escalation queue:** item created by the harness or the lead (reason, project, proposed action); one team member's approval suffices (given on behalf of the team of three and logged), refusals carry a reason; 24 h target; no answer means the action stays blocked (never implicit approval).

**Access scoping:** one scoped key per project (that project only, revocable, capped), held server-side, never shown. The lead acts through their own OPC account with a role on the assigned project; they never see the client's password, email or card. The AI provider key stays server-side.

**Privacy (PIPEDA and Ontario):** explicit consent before the client's input goes to the AI and to a lead outside Canada (cross-border transfer disclosed); minimisation (pseudonym shown to the lead); host with no training on data; access and deletion on request; named privacy officer; breach report to the Commissioner.

## Clé API et pilotage de l'IA (approuvé par Popol, 04/11/2026 17:15) / API key and AI piloting (approved by Popol, 04/11/2026 17:15)

### FR
1. **Une seule clé API** pour l'IA open source nord-américaine, conservée uniquement comme secret sur notre serveur. Elle n'est jamais remise au client ni au chef de projet. Lecture unique des clés : il n'existe qu'une seule clé chez le fournisseur d'IA. La « clé par projet » de la section précédente désigne la portée d'accès interne gérée par notre serveur et le harnais (attribution de la consommation, plafond et révocation par projet) — ce n'est pas une deuxième clé chez le fournisseur.
2. **Le client** parle à l'IA dans l'appli ; l'appli passe toujours par notre serveur, qui seul détient la clé.
3. **Le chef de projet** a son propre accès personnel (nom + mot de passe) dans « Mes clients ». Il ne voit que les projets des clients qui lui sont assignés, avec tout l'historique. Il pilote la même IA, par le même serveur, et accepte ou refuse ses propositions.
4. **Le harnais** tourne côté serveur : il applique les règles et compte la consommation de chaque projet, pour les plafonds par formule.
5. **Déroulement :** l'IA cherche et prépare (recherches, code) → le chef de projet valide et teste → le projet est déposé dans l'organisation GitHub `Cle-en-main-Essaim-Agents` (un dépôt privé par client) → le client suit son site en ligne. Le client voit la liste d'étapes et l'avancement dans son appli.
6. **Trois actions que le chef de projet ne fait jamais seul :** tout paiement (domaine, billets…), toute réservation au nom du client, et la première mise en ligne. L'IA prépare la demande ; l'approbation est donnée au nom de l'équipe de trois (Popol, Indiana, Yves) par l'un de ses membres, et elle est journalisée (visible et contestable par les deux autres), comme dans la file d'escalade. Le paiement passe par une page de paiement hébergée ; le domaine est enregistré au nom du client (option A).

### EN
1. **One single API key** for the North-American open-source AI, stored only as a server secret. It is never given to the client or the project lead. Single reading of the keys: there is only one key at the AI provider. The 'per-project key' in the previous section means the internal access scope managed by our server and the harness (usage attribution, cap and revocation per project) — it is not a second key at the provider.
2. **The client** talks to the AI in the app; the app always goes through our server, which alone holds the key.
3. **The project lead** has a personal login (name + password) in "Mes clients". They see only their assigned clients' projects, with the full history. They drive the same AI through the same server and accept or refuse its proposals.
4. **The harness** runs server-side: it applies the rules and meters usage per project, for per-plan caps.
5. **Flow:** the AI researches and prepares (research, code) → the lead validates and tests → the project is pushed to the GitHub org `Cle-en-main-Essaim-Agents` (one private repo per client) → the client follows the live site. The client sees the step list and progress in their app.
6. **Three actions the lead never does alone:** any payment (domain, tickets…), any booking in the client's name, and the first go-live. The AI prepares the request; approval is given on behalf of the team of three (Popol, Indiana, Yves) by one of its members, and it is logged (visible and contestable by the other two), as in the escalation queue. Payment goes through a hosted checkout; the domain is registered in the client's name (option A).

---

## Réserves de la revue Knicks (4 nov. 2026) — à trancher avant tout code / Knicks review reserves — to settle before any code

Non bloquantes pour la bêta courriel du 9 novembre. Aucun code « Mes clients » ne sera écrit avant qu'elles soient tranchées dans une PR de spécification dédiée.
Non-blocking for the 9 November email beta. No "Mes clients" code will be written before these are settled in a dedicated spec PR.

1. **Masquage du relais / Relay masking** — décrire le mécanisme : en-têtes `From`/`Reply-To` réécrits, citations retirées des réponses, notifications sans adresse ni nom de famille. / Describe the mechanism: rewritten `From`/`Reply-To`, quoted text stripped from replies, notifications without address or surname.
2. **Canal du client / Client channel** — choisir comment le client Clé en main voit la liste d'étapes (lien courriel signé ou espace dédié). Point le plus important. / Choose how the client sees the step list (signed email link or dedicated space). Top priority.
3. **Réciprocité et texte libre / Reciprocity and free text** — préciser ce que le client voit du chef de projet ; filtrer la description de projet (courriels, téléphones, adresses). / Specify what the client sees of the project lead; filter the project description (emails, phones, addresses).
4. **Sécurité / Security** — accès strictement par assignation, vérifié côté serveur ; le code VIBE-CLE est un identifiant, jamais un justificatif ; fils journalisés et relisibles par l'équipe ; procédure de révocation d'un chef de projet et purge des données sur son appareil. / Assignment-only access checked server-side; the VIBE-CLE code is an identifier, never a credential; threads logged and reviewable by the team; project-lead revocation procedure and on-device data purge.
5. **Infrastructure** — modèle de données (assignations, fils, messages) via une nouvelle migration ; stockage des notes vocales à valider avec Popol (aucune dépense sans son accord) ; le code VIBE-CLE naît côté site et sera importé dans OPC. / Data model via a new migration; voice-note storage to be approved by Popol (no spending without approval); the VIBE-CLE code is created on the site and imported into OPC.

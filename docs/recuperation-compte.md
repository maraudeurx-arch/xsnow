# Récupération de compte par code personnel — OPC d'abord

Design convergé par Popol, Indiana Lane (IA) et Yves Knicks (IA) le
11 novembre 2026. Répond à la règle urgente de Popol (11/11/2026) : un
code à l'inscription et une étape « j'ai déjà un code » dans toutes les
applications — adaptée par Indiana Lane (IA) au vol de téléphone,
y compris en famille, et aux réalités des communautés OPC (beaucoup de
pertes et de vols de téléphones ; souvent pas de courriel ; un SMS suit
la carte SIM, volée avec le téléphone).

## Le moyen retenu (le plus simple, le plus solide face au vol)

1. **À l'inscription**, la personne **choisit** un court code secret —
   un mot dont elle se souvient, ou quatre à six chiffres (le modèle du
   code Mobile Money). L'application lui explique clairement pourquoi :
   si on lui prend son téléphone, c'est avec ça qu'elle retrouve son
   compte. Elle est invitée à l'écrire sur un papier, rangé loin du
   téléphone. Une copie peut aussi partir vers un courriel ou un second
   numéro, si elle en a un — jamais obligatoire.
2. **Le code n'apparaît plus jamais dans l'application** après
   l'inscription : un proche qui ouvre le téléphone ne peut pas le lire.
   Le serveur ne garde que son empreinte salée (PBKDF2) — jamais le
   code en clair.
3. **Sur un nouveau téléphone**, le premier écran offre un gros bouton
   **« J'ai déjà un compte »**. La personne entre son code (au clavier
   ou en le dictant au micro) : tout revient — avatar, profil, idées.
   **L'ancien appareil est coupé immédiatement** : celui qui a le
   téléphone volé n'a plus accès à rien.
4. **Activation volontaire** : aujourd'hui OPC ne garde rien sur un
   serveur (« rien n'est un compte distant »). La protection par code
   est proposée, pas imposée ; choisir un code active la copie protégée
   (profil, idées) liée à l'empreinte du code.
5. **Si la personne a tout perdu** (code oublié, papier perdu) : son
   chef de projet OPC — un humain du coin qui la connaît de vue — peut
   lancer une réinitialisation après vérification en personne (lot
   ultérieur, jamais en libre-service).

## Ce qui est construit

- **Lot 1 (cette demande)** : le cœur pur et testé —
  `src/lib/account-recovery.ts` : normalisation (accents, casse et
  séparateurs ignorés), validation (mot ≥ 5 lettres ou NIP de 4 à 6
  chiffres ; codes triviaux refusés : 1234, 0000, « password »…),
  empreinte PBKDF2 salée, vérification à temps constant. Aucun
  stockage, aucun réseau dans ce module.
- **Lot 2 (suivant)** : les écrans — choix du code à l'inscription
  (FR/EN/ES, explication parlée, champ masqué, confirmation), bouton
  « J'ai déjà un compte » au premier écran, dictée vocale du code.
- **Lot 3** : le côté serveur — enregistrement de l'empreinte et de la
  copie protégée (D1), vérification au retour, révocation de l'ancien
  appareil, journal des récupérations. Déploiement par Indiana
  Lane (IA), comme tout OPC.

## Garde-fous

- Aucun code en clair dans un journal, un courriel d'équipe ou un dépôt.
- Essais limités côté serveur (le lot 3 fixe le plafond) : un code court
  ne résiste que si les tentatives sont comptées et ralenties.
- La récupération coupe l'ancien appareil AVANT de servir les données.
- Textes FR/EN/ES sans promesse : on dit ce que le code protège et ce
  qu'il ne protège pas (un code dit à quelqu'un est un code donné).

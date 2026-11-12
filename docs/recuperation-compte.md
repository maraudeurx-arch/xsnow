# Récupération de compte — mécanique complète (OPC d'abord)

Convergée le 11 novembre 2026 : proposition d'Yves Knicks (IA), gardes
d'Indiana Lane (IA), feu vert de Popol pour la mettre en pratique sans
lui redemander la permission. Répond à sa règle urgente du 11/11 : un
code à l'inscription et une étape « j'ai déjà un code » dans toutes les
applications. Réalités visées : en Afrique, les téléphones se perdent
et se volent beaucoup — même entre membres d'une même famille ;
beaucoup de gens n'ont pas de courriel ; un SMS suit la carte SIM,
souvent volée avec le téléphone.

## La mécanique retenue (modèle Mobile Money, en deux éléments)

**À l'inscription, la personne reçoit et choisit deux choses :**

1. **Son code OPC personnel** — court et dicable, montré en gros à
   l'écran, lu à voix haute par l'application, et envoyé par courriel
   si la personne en a un. On lui dit : « c'est la clé de ta maison
   OPC ». On lui conseille de l'écrire sur un papier, rangé loin du
   téléphone. Ce code identifie le compte ; il n'est pas le secret.
2. **Un code secret à 4 chiffres, choisi par elle-même** — comme le
   code d'Orange Money. Il n'est écrit nulle part, il reste dans sa
   tête. Le serveur ne garde que son empreinte salée (PBKDF2) — jamais
   les chiffres en clair.

**Sur un nouveau téléphone :**

Installer OPC → gros bouton **« J'ai déjà un code »** → entrer le code
OPC (tapé ou dicté au micro) → entrer les 4 chiffres → **le compte se
rouvre au complet** (avatar, profil, idées). Aussitôt : **l'ancien
téléphone est déconnecté** et la personne reçoit une alerte (courriel
ou second numéro, si elle en a un).

**Au quotidien :** les 4 chiffres sont aussi le cadenas de
l'application — demandés à l'ouverture, et le cadenas se referme quand
l'application passe en arrière-plan ou après une courte inactivité.
Le téléphone volé ne sert donc à rien sans les chiffres, et le code
OPC écrit sur un papier ne suffit pas non plus. **Le code OPC ne
réapparaît jamais dans l'application sans les 4 chiffres.**

**Si la personne a tout perdu** (code et chiffres) : son chef de projet
OPC — un humain du coin, qui la connaît de vue — peut lancer la
réinitialisation, **en personne seulement**, après vérification. La
personne choisit elle-même ses nouveaux codes ; le chef ne voit jamais
les 4 chiffres ; chaque réinitialisation est journalisée. Cette voie
n'est promise que là où un chef formé est vraiment présent. Si l'accès
au courriel subsiste depuis un autre appareil, la réinitialisation des
seuls 4 chiffres par courriel reste possible.

## Gardes (Indiana Lane (IA), 11/11/2026)

- **Blocage après 5 essais faux**, temporaire, avec un délai qui
  grandit à chaque nouvelle série d'échecs.
- Codes triviaux refusés à la création (1234, 0000, suites…) : ce sont
  les premiers essais d'un voleur — ou d'un proche curieux.
- Aucun code en clair dans un journal, un courriel ou un dépôt.
- La récupération coupe l'ancien appareil AVANT de servir les données.
- Chaque récupération et chaque réinitialisation sont journalisées
  (qui, quand, quel appareil) — sans jamais écrire les codes.
- Textes FR/EN/ES sans promesse : on dit ce que le code protège et ce
  qu'il ne protège pas (un code dit à quelqu'un est un code donné).

## Construction

- **Lot 1 (demande nº 249)** : le cœur pur et testé —
  `src/lib/account-recovery.ts` : génération et format du code OPC
  (alphabet sans caractères confondables), normalisation, validation
  du secret (NIP de 4 à 6 chiffres ou mot ≥ 5 lettres pour les autres
  applications ; OPC retient les 4 chiffres), empreinte PBKDF2 salée,
  vérification à temps constant, constante du plafond d'essais (5).
  Aucun stockage, aucun réseau dans ce module. 11+ vérifications
  vertes, tsc propre.
- **Lot 2** : les écrans — inscription (code montré en gros, lecture à
  voix haute, choix masqué des 4 chiffres), « J'ai déjà un compte »,
  dictée vocale, cadenas à l'ouverture et en arrière-plan.
- **Lot 3** : le côté serveur — enregistrement (code OPC, empreinte,
  copie protégée du profil et des idées), vérification avec blocage
  progressif, révocation de l'ancien appareil, journal. Déploiement par
  Indiana Lane (IA), comme tout OPC.

La protection est **volontaire** : aujourd'hui OPC ne garde rien sur un
serveur. Choisir ses codes active la copie protégée ; sans codes, tout
reste sur l'appareil, comme maintenant.

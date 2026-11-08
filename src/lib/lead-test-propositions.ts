/**
 * « Test des chefs de projet » (08/11/2026) — banque des propositions.
 *
 * Test de formation d'une journée, décidé par l'équipe d'Essaim-Agents : chaque
 * chef de projet Clé en Main reçoit, DANS son espace « Mes projets » (page de
 * SON projet), 12 propositions tirées du cahier des charges de son projet.
 * Chaque proposition offre trois choix (A / B / C) et la suggestion de l'IA du
 * projet, visible AVANT de répondre : le but du test est d'apprendre au chef à
 * suivre les suggestions de l'IA de son projet, sauf raison concrète contraire.
 *
 * Textes repris fidèlement de la banque préparée par l'équipe
 * (test-chefs-2026-11-08/propositions.md) ; seul l'habillage courriel
 * (« Bonjour… », « Réponds à ce courriel… », signature) est retiré — dans
 * l'application, les boutons SONT la réponse.
 *
 * LANGUE : français seulement. Test interne d'un jour, chefs francophones ;
 * le panneau (LeadTestPanel) n'est donc pas branché sur l'i18n du site.
 */

export type LeadTestChoice = "A" | "B" | "C";

export const LEAD_TEST_CHOICES: readonly LeadTestChoice[] = ["A", "B", "C"];

export type LeadTestProposition = {
  /** Numéro de la proposition, de 1 à 12. */
  n: number;
  /** Contexte + question, tels que préparés par l'équipe. */
  prompt: string;
  /** Les trois choix, par lettre. */
  choices: Record<LeadTestChoice, string>;
  /** La lettre suggérée par l'IA du projet. */
  suggestion: LeadTestChoice;
  /** La raison de la suggestion, telle que préparée par l'équipe. */
  suggestionReason: string;
};

export type LeadTestProjectTest = {
  /** Identifiant du projet dans le registre des chefs (src/lib/lead-projects.ts). */
  projectId: string;
  /** Rang du projet chez le client (1er, 2e, …), pour les libellés. */
  projectNumber: number;
  /** Titre du projet, pour les libellés et le courriel à l'équipe. */
  projectTitle: string;
  /** Code OPC du chef rattaché à ce projet (contrôle côté serveur). */
  chefOpcId: string;
  /** Nom du chef, pour le courriel à l'équipe. */
  chefName: string;
  propositions: readonly LeadTestProposition[];
};

/**
 * Début du test — UN SEUL endroit où le changer.
 * 2026-11-08T16:00:00Z = dimanche 8 novembre 2026, 11 h 00, heure de l'Est (HNE).
 */
export const LEAD_TEST_START_ISO = "2026-11-08T16:00:00Z";

const EDUCATION_PROPOSITIONS: readonly LeadTestProposition[] = [
  {
    n: 1,
    prompt:
      "Le cahier des charges est validé ; il faut décider par quel bout on commence la construction.\n\nPar quoi commences-tu ?",
    choices: {
      A: "Le tableau de bord de l'enseignant",
      B: "Le parcours d'accès : création de la classe, code de classe, première connexion d'un élève",
      C: "La publication de contenus par l'enseignant",
    },
    suggestion: "B",
    suggestionReason:
      "le parcours d'accès est le moment qui décide si l'outil sera adopté ; il doit prendre moins d'une minute.",
  },
  {
    n: 2,
    prompt: "Comment les élèves entrent-ils dans l'interface de la classe ?",
    choices: {
      A: "Un compte courriel par élève",
      B: "Le code de classe + un prénom ou un pseudonyme, sans courriel",
      C: "Une liste de comptes importée par l'école",
    },
    suggestion: "B",
    suggestionReason:
      "aucun courriel d'élève : vie privée des mineurs protégée et entrée en quelques secondes.",
  },
  {
    n: 3,
    prompt: "Quelle longueur pour le code de classe que les élèves tapent ?",
    choices: {
      A: "4 caractères",
      B: "6 caractères, sans lettres ambiguës (pas de O/0, pas de I/1)",
      C: "10 caractères",
    },
    suggestion: "B",
    suggestionReason:
      "assez court pour de jeunes élèves, assez long pour éviter les collisions entre classes ; l'enseignant peut le régénérer.",
  },
  {
    n: 4,
    prompt: "Au jalon 2 (publication de contenus), que livre-t-on d'abord ?",
    choices: {
      A: "Les documents seulement (téléversements)",
      B: "Le texte et les liens d'abord ; les documents au jalon suivant",
      C: "Tout d'un coup : texte, liens et documents",
    },
    suggestion: "B",
    suggestionReason:
      "des jalons courts montrés au client un par un ; les téléversements sont la partie la plus lourde, elle vient après la preuve du parcours simple.",
  },
  {
    n: 5,
    prompt: "Dans le tableau de bord, comment les élèves sont-ils nommés ?",
    choices: {
      A: "Nom complet de chaque élève",
      B: "Prénom ou pseudonyme choisi en classe",
      C: "Un numéro anonyme",
    },
    suggestion: "B",
    suggestionReason:
      "c'est ce que prévoit le cahier : l'enseignant reconnaît ses élèves, sans recueillir de données personnelles d'enfants.",
  },
  {
    n: 6,
    prompt: "La question des langues pour la première version :",
    choices: {
      A: "Français seulement, sans rien prévoir",
      B: "Français et anglais dès la première version",
      C: "Français d'abord, mais l'architecture prête à ajouter une deuxième langue plus tard",
    },
    suggestion: "C",
    suggestionReason:
      "le cahier le prévoit : on ne construit pas la deuxième langue tout de suite, mais on ne se ferme pas la porte.",
  },
  {
    n: 7,
    prompt: "Que voit l'enseignant sur la consultation de ses contenus ?",
    choices: {
      A: "Qui a consulté quoi, élève par élève",
      B: "Seulement un compteur global par contenu",
      C: "Rien du tout",
    },
    suggestion: "A",
    suggestionReason:
      "le cahier prévoit l'état de consultation par élève ; c'est ce qui rend le tableau de bord utile à l'enseignant.",
  },
  {
    n: 8,
    prompt: "À quel rythme montre-t-on l'avancement au client ?",
    choices: {
      A: "Une seule démonstration, à la fin",
      B: "Une démonstration à chaque jalon",
      C: "Quand le chef de projet le juge nécessaire",
    },
    suggestion: "B",
    suggestionReason:
      "le procédé de l'équipe : chaque jalon est montré au client avant de passer au suivant ; c'est ce qui évite les mauvaises surprises.",
  },
  {
    n: 9,
    prompt: "Avant d'ajouter des fonctions, quel essai fait-on ?",
    choices: {
      A: "Aucun essai, on lance",
      B: "Un essai avec une vraie classe",
      C: "Un essai interne seulement, entre nous",
    },
    suggestion: "B",
    suggestionReason:
      "le cahier le dit : la première version s'éprouve avec une vraie classe avant tout ajout.",
  },
  {
    n: 10,
    prompt: "Comment l'enseignant se connecte-t-il à son compte ?",
    choices: {
      A: "Courriel + mot de passe",
      B: "Le même code que les élèves",
      C: "Un lien envoyé par courriel à chaque connexion",
    },
    suggestion: "A",
    suggestionReason:
      "l'enseignant a un vrai compte (le cahier le prévoit) ; simple, standard, et séparé de l'accès des élèves.",
  },
  {
    n: 11,
    prompt:
      "Le client n'a pas encore précisé l'âge des élèves (question posée au cahier). Que fais-tu ?",
    choices: {
      A: "Tu attends sa réponse sans rien construire",
      B: "Tu construis avec l'hypothèse « primaire : grands textes, écrans très simples », et tu ajustes à sa réponse",
      C: "Tu choisis « secondaire » par défaut",
    },
    suggestion: "B",
    suggestionReason:
      "on avance avec une hypothèse réversible et écrite ; attendre sans rien faire retarde le projet sans protéger personne.",
  },
  {
    n: 12,
    prompt:
      "La première version est livrée et essayée. Quelle est la première amélioration à construire ?",
    choices: {
      A: "Plusieurs classes par enseignant",
      B: "Un clavardage entre élèves",
      C: "Les notes et les bulletins",
    },
    suggestion: "A",
    suggestionReason:
      "c'est l'ajout prévu dès le départ ; le clavardage et les notes sont hors portée de la première version au cahier.",
  },
];

const HAUTE_COUTURE_PROPOSITIONS: readonly LeadTestProposition[] = [
  {
    n: 1,
    prompt:
      "L'étude de faisabilité est terminée (faisable avec conditions, 62/100). Par quel segment commence-t-on ?",
    choices: {
      A: "Les vêtements pour adultes d'abord",
      B: "Le bébé d'abord, plus un modèle adulte témoin",
      C: "Les vêtements pour enfants d'abord",
    },
    suggestion: "B",
    suggestionReason:
      "les vêtements pour bébés entrent au Canada en franchise de droits (0 %, contre 17–18 % pour l'adulte) et les modèles sont simples : c'est le démarrage rationnel.",
  },
  {
    n: 2,
    prompt: "Avant l'envoi des patrons en usine, qui les valide ?",
    choices: {
      A: "Le client valide seul",
      B: "Un modéliste valide chaque patron et la gradation des tailles",
      C: "L'usine validera sur place",
    },
    suggestion: "B",
    suggestionReason:
      "le dossier technique est le goulot du projet : une validation par un modéliste fait passer les rondes d'échantillons d'environ 4,5 à 1,8.",
  },
  {
    n: 3,
    prompt: "Les étiquettes des vêtements (bilingues, avec le numéro CA du client) :",
    choices: {
      A: "On les ajoute au Canada, après réception",
      B: "Elles sont cousues en usine, dès la production",
      C: "Des étiquettes volantes suffisent",
    },
    suggestion: "B",
    suggestionReason:
      "la conformité se dessine dès le départ, elle ne se corrige pas après : étiquette bilingue avec numéro CA cousue en usine.",
  },
  {
    n: 4,
    prompt: "Les cordons à la capuche et au cou sur les modèles pour enfants :",
    choices: {
      A: "Permis si le modèle est joli",
      B: "Aucun, dès le dessin",
      C: "L'usine décidera",
    },
    suggestion: "B",
    suggestionReason:
      "les règles de Santé Canada sont strictes (nouveau-né à 12 ans) ; on les respecte dès le dessin, jamais après.",
  },
  {
    n: 5,
    prompt: "Par quel canal passe la première commande à l'usine ?",
    choices: {
      A: "Un virement direct à l'usine",
      B: "Trade Assurance, au démarrage",
      C: "Paiement seulement à la réception au magasin",
    },
    suggestion: "B",
    suggestionReason:
      "la chaîne d'achat protégée du cahier : Trade Assurance tant que la relation avec l'usine n'est pas éprouvée.",
  },
  {
    n: 6,
    prompt: "Avant d'envoyer les dessins et dossiers techniques à une usine, que faut-il ?",
    choices: {
      A: "Rien de spécial",
      B: "Une entente NNN signée (non-divulgation, non-utilisation, non-contournement)",
      C: "Un simple courriel de politesse",
    },
    suggestion: "B",
    suggestionReason:
      "aucun dossier technique ne part avant la signature du NNN ; c'est la protection des modèles du client.",
  },
  {
    n: 7,
    prompt: "Quand paie-t-on le solde d'une commande ?",
    choices: {
      A: "Avant le début de la production",
      B: "Après l'inspection pré-expédition (niveau AQL 2,5), avant l'envoi",
      C: "Après la réception au magasin",
    },
    suggestion: "B",
    suggestionReason:
      "l'inspection avant le solde fait partie de la chaîne protégée : on paie le solde quand la marchandise inspectée est conforme, pas avant.",
  },
  {
    n: 8,
    prompt: "La taille du premier lot pilote :",
    choices: {
      A: "Environ 5 000 pièces, pour avoir du stock",
      B: "Environ 300 à 600 pièces au total",
      C: "Environ 50 pièces seulement",
    },
    suggestion: "B",
    suggestionReason:
      "un premier lot réel, vendu et analysé en magasin avant d'élargir ; le minimum par modèle (100 pièces/couleur) doit rester absorbable par le magasin.",
  },
  {
    n: 9,
    prompt: "Le transport : échantillons et production.",
    choices: {
      A: "Tout par bateau",
      B: "Échantillons par avion, production par bateau (conteneur partagé)",
      C: "Tout par avion",
    },
    suggestion: "B",
    suggestionReason:
      "la vitesse compte pour les échantillons (les rondes décident du calendrier), le coût compte pour la production.",
  },
  {
    n: 10,
    prompt: "Quand fixe-t-on les prix de détail en magasin ?",
    choices: {
      A: "Dès maintenant, avant de commander",
      B: "Après la réception du lot, à partir du calculateur de coût rendu (usine + fret + droits + taxes + inspection)",
      C: "En copiant les prix d'un concurrent",
    },
    suggestion: "B",
    suggestionReason:
      "aucun prix n'est figé avant de connaître le coût réel rendu au magasin, pièce par pièce.",
  },
  {
    n: 11,
    prompt: "Les vêtements de nuit pour enfants dans la première version :",
    choices: {
      A: "Inclus comme les autres modèles",
      B: "Exclus de la première version (ils ont leur propre règlement d'inflammabilité)",
      C: "Inclus sans test particulier",
    },
    suggestion: "B",
    suggestionReason:
      "le cahier les met hors portée de la première version ; ils entreront après la mise en place des tests de conformité.",
  },
  {
    n: 12,
    prompt: "Les tests d'inflammabilité des tissus :",
    choices: {
      A: "Après la première production",
      B: "Avant la première production",
      C: "Inutiles pour les vêtements de bébé",
    },
    suggestion: "B",
    suggestionReason:
      "les tests se font avant de produire ; après, il est trop tard pour corriger un lot entier.",
  },
];

/**
 * Les deux tests du 8 novembre 2026, indexés par l'identifiant du projet dans
 * le registre des chefs. Un projet sans entrée ici n'affiche aucun panneau.
 */
export const LEAD_TESTS_BY_PROJECT_ID: Readonly<Record<string, LeadTestProjectTest>> = {
  education: {
    projectId: "education",
    projectNumber: 1,
    projectTitle: "Éducation",
    chefOpcId: "OPC-5X78",
    chefName: "Steve Badinga",
    propositions: EDUCATION_PROPOSITIONS,
  },
  "haute-couture": {
    projectId: "haute-couture",
    projectNumber: 2,
    projectTitle: "Haute couture",
    chefOpcId: "OPC-UBNZ",
    chefName: "Alex Kumba",
    propositions: HAUTE_COUTURE_PROPOSITIONS,
  },
};

/** Le test rattaché à ce projet, ou null si le projet n'est pas en test. */
export function leadTestForProject(projectId: unknown): LeadTestProjectTest | null {
  if (typeof projectId !== "string") return null;
  return LEAD_TESTS_BY_PROJECT_ID[projectId] ?? null;
}

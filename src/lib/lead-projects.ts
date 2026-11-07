/**
 * « Mes projets » — registre des projets Clé en Main rattachés à un chef de projet OPC.
 *
 * Mécanisme (v1, 07/11/2026) : un registre statique dans le code, indexé par le
 * code OPC du chef (le même code que son profil d'appareil, p. ex. OPC-5X78).
 * L'équipe rattache un projet en ajoutant une entrée ici, via une demande de
 * fusion : aucun serveur ni base nouvelle, l'espace du chef lit ce registre.
 * Limite assumée : un rattachement devient visible au prochain déploiement du
 * site, et le chef ne voit que les projets de SON code. Le passage à une table
 * côté Worker (assignations en base) reste la piste « lancement » du document
 * de conception docs/mes-clients-design.md.
 *
 * Vie privée (même règle que la conception) : le chef voit le code client, le
 * titre, le résumé et le cahier des charges — jamais le courriel, le téléphone
 * ni le paiement du client. Les cahiers ci-dessous sont donc la copie « chef » :
 * le contenu métier intégral, sans les notes de paiement du cahier client.
 */

export type LeadProjectStatus = "nouveau" | "en_cours" | "en_attente_client" | "termine";

export const LEAD_PROJECT_STATUSES: readonly LeadProjectStatus[] = [
  "nouveau",
  "en_cours",
  "en_attente_client",
  "termine",
];

export type LeadProjectStepState = "done" | "current" | "todo";

export type LeadProjectStep = {
  label: string;
  state: LeadProjectStepState;
};

export type LeadProject = {
  /** Identifiant stable et unique du projet dans l'espace chef (URL, fils). */
  id: string;
  /** Rang du projet chez le client (1er, 2e, …). */
  number: number;
  title: string;
  /** Code client Clé en Main (CLE-XXXXXX) ; "" tant qu'il n'est pas connu de l'équipe. */
  clientCode: string;
  status: LeadProjectStatus;
  /** Résumé du projet, tel que transmis par l'équipe (description du client). */
  summary: string;
  /** Cahier des charges complet (copie chef, sans notes de paiement) ; null = en préparation. */
  spec: string | null;
  /** Fiche condensée donnée à l'IA du projet (le prompt système est plafonné côté Worker). */
  aiBrief: string;
  steps: LeadProjectStep[];
  /** Dernière activité connue, date ISO (aaaa-mm-jj). */
  updatedAt: string;
};

const EDUCATION_SPEC = `Cahier des charges — Projet « Éducation »

Client : code CLE-PQ0ASQ · Projet nº 1
Préparé par : l'IA accompagnante du client, avec l'équipe d'Essaim-Agents
Remis le : 7 novembre 2026 (moins de 24 heures après la réception du projet, selon le procédé)

1. Résumé du projet (préparé par l'IA accompagnante)

« J'aimerais préparer une interface pour que tous les élèves de la classe puissent avoir un… »

Interprétation de l'IA (à valider par le client) : une interface de classe où l'enseignant donne à chaque élève un accès simple aux contenus et activités de la classe, sans que les élèves aient besoin d'un courriel ni d'un compte compliqué.

2. Objectif et utilisateurs

- Enseignant : créer sa classe, y déposer ses contenus (consignes, documents, activités) et suivre qui a consulté quoi.
- Élèves : entrer dans l'interface de la classe en quelques secondes, voir ce que l'enseignant a préparé, y répondre ou le consulter.
- Principe directeur : la simplicité d'abord — utilisable par de jeunes élèves, sur téléphone, tablette ou ordinateur.

3. Portée de la première version (proposition)

1. Compte enseignant et création d'une classe.
2. Code de classe : les élèves rejoignent avec un code court (aucun courriel d'élève, aucune donnée personnelle d'enfant recueillie).
3. Page de classe : l'enseignant publie des contenus (texte, liens, documents) ; les élèves les voient dans l'ordre.
4. Tableau de bord simple pour l'enseignant : liste des élèves (prénoms ou pseudonymes choisis en classe) et état de consultation.
5. Interface en français d'abord, grandes cibles tactiles, contraste fort.

4. Hors portée de la première version

- Notes, bulletins et communications officielles avec les parents.
- Vidéoconférence et clavardage entre élèves.
- Paiements et boutique.

5. Suggestions de l'IA au chef de projet

1. Commencer par le parcours d'accès (création de classe + code + première connexion d'un élève) : c'est le moment qui décide si l'outil sera adopté ; il doit prendre moins d'une minute.
2. Aucun compte courriel pour les élèves : le code de classe + un prénom suffit — protection de la vie privée des mineurs et simplicité.
3. Construire en jalons courts, chacun montré au client : J1 accès et classe ; J2 publication de contenus ; J3 tableau de bord ; puis essai avec une vraie classe avant d'ajouter quoi que ce soit.
4. Prévoir dès le départ l'ajout ultérieur d'une deuxième langue et de plusieurs classes par enseignant, sans les construire tout de suite.

6. Déroulement et délais

- Cahier des charges : remis le jour même de la réception du projet (fait).
- Après validation du client : construction petit à petit, jalon par jalon, avec démonstration à chaque jalon.
- L'IA accompagnante fait le lien entre le client et le chef de projet à chaque étape.

7. Décisions demandées au client

1. L'interprétation du résumé (un accès par élève à l'interface de la classe) est-elle la bonne ? Sinon, préciser la fin de la phrase : « …pour que tous les élèves puissent avoir un ___ ».
2. Âge approximatif des élèves (cela règle la taille des textes et la simplicité des écrans).
3. L'enseignant veut-il déposer surtout des documents, des activités interactives, ou les deux ?

8. Note de l'équipe

Le projet nº 1 est en file de construction dès validation du présent cahier.`;

const EDUCATION_BRIEF = `Portée v1 : compte enseignant et création d'une classe ; code de classe court pour les élèves (aucun courriel d'élève, aucune donnée personnelle d'enfant) ; page de classe où l'enseignant publie textes, liens et documents ; tableau de bord simple (prénoms ou pseudonymes, état de consultation) ; français d'abord, grandes cibles tactiles.
Hors portée v1 : notes et bulletins, communications officielles aux parents, vidéoconférence, clavardage entre élèves, paiements.
Suggestions de l'équipe : commencer par le parcours d'accès (moins d'une minute) ; jalons courts montrés au client — J1 accès et classe, J2 publication de contenus, J3 tableau de bord ; prévoir une 2e langue et plusieurs classes sans les construire tout de suite.
Décisions en attente du client : valider l'interprétation du résumé ; âge approximatif des élèves ; documents, activités interactives, ou les deux.`;

const HAUTE_COUTURE_SUMMARY = `« J'ai un magasin où je vends des vêtements. J'aimerais que l'application m'aide à créer des vêtements pour bébé, des vêtements pour enfants, des vêtements pour adultes. Envoyer les dessins de vêtements créatifs en Chine pour la confection, faire exécuter en Chine, faire fabriquer ces vêtements, les renvoyer au Canada à mon magasin pour la vente. »`;

const HAUTE_COUTURE_BRIEF = `Le client tient un magasin de vêtements au Canada. L'application à construire doit l'aider à créer des vêtements (bébé, enfants, adultes), à envoyer ses dessins créatifs en Chine pour la confection et la fabrication, puis à faire revenir les vêtements fabriqués à son magasin pour la vente. Le cahier des charges est en préparation : expertise de l'IA accompagnante, puis contre-expertise de l'équipe. Tant qu'il n'est pas remis, aide le chef à préparer ses questions (gammes, quantités, délais, qualité attendue) sans promettre de dates ni de prix au client.`;

/**
 * Rattachements en vigueur. Clé = code OPC du chef. Pour ajouter un projet
 * (nº 3, 4, … 20) : ajouter une entrée dans la liste du chef concerné.
 */
export const LEAD_PROJECT_REGISTRY: Readonly<Record<string, readonly LeadProject[]>> = {
  // Steve Badinga — chef de projet (Douya Onoye, Gabon).
  "OPC-5X78": [
    {
      id: "education",
      number: 1,
      title: "Éducation",
      clientCode: "CLE-PQ0ASQ",
      status: "en_attente_client",
      summary:
        "Une interface de classe : l'enseignant crée sa classe et y dépose ses contenus (consignes, documents, activités) ; chaque élève y accède simplement avec un code court — aucun courriel d'élève, aucune donnée personnelle d'enfant recueillie.",
      spec: EDUCATION_SPEC,
      aiBrief: EDUCATION_BRIEF,
      steps: [
        { label: "Projet reçu par l'équipe", state: "done" },
        { label: "Cahier des charges remis au client", state: "done" },
        { label: "Validation du client (décisions demandées au §7 du cahier)", state: "current" },
        { label: "Construction par jalons : J1 accès et classe, J2 contenus, J3 tableau de bord", state: "todo" },
        { label: "Essai avec une vraie classe, puis livraison", state: "todo" },
      ],
      updatedAt: "2026-11-07",
    },
  ],
  // Alex Kumba — chef de projet.
  "OPC-UBNZ": [
    {
      id: "haute-couture",
      number: 2,
      title: "Haute couture",
      clientCode: "",
      status: "nouveau",
      summary: HAUTE_COUTURE_SUMMARY,
      spec: null,
      aiBrief: HAUTE_COUTURE_BRIEF,
      steps: [
        { label: "Projet reçu par l'équipe", state: "done" },
        { label: "Expertise de l'IA accompagnante, puis contre-expertise de l'équipe", state: "current" },
        { label: "Cahier des charges remis au chef de projet, avec les suggestions de l'équipe", state: "todo" },
        { label: "Construction par jalons, avec démonstration au client à chaque jalon", state: "todo" },
      ],
      updatedAt: "2026-11-07",
    },
  ],
};

export function normalizeOpcId(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toUpperCase() : "";
}

/** Lecture pure du registre (testable avec un registre synthétique). */
export function projectsFromRegistry(
  registry: Readonly<Record<string, readonly LeadProject[]>>,
  opcId: unknown,
): LeadProject[] {
  const list = registry[normalizeOpcId(opcId)];
  return list ? [...list] : [];
}

/** Les projets rattachés à ce code OPC (liste vide si le code est inconnu). */
export function leadProjectsFor(opcId: unknown): LeadProject[] {
  return projectsFromRegistry(LEAD_PROJECT_REGISTRY, opcId);
}

export function findLeadProject(opcId: unknown, projectId: unknown): LeadProject | null {
  if (typeof projectId !== "string" || !projectId) return null;
  return leadProjectsFor(opcId).find((p) => p.id === projectId) ?? null;
}

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

const HAUTE_COUTURE_SPEC = `Cahier des charges — Projet « Haute couture »

Client : projet nº 2
Préparé par : l'IA accompagnante du client (expertise), contre-expertise d'Yves Knicks (IA), pour l'équipe d'Essaim-Agents
Remis le : 7 novembre 2026 (le jour même de la réception du projet, selon le procédé)
Chef de projet : Alex

1. Résumé du projet (paroles du client)

« J'ai un magasin où je vends des vêtements. J'aimerais que l'application m'aide à créer des vêtements pour bébé, des vêtements pour enfants, des vêtements pour adultes. Envoyer les dessins de vêtements créatifs en Chine pour la confection, faire exécuter en Chine, faire fabriquer ces vêtements, les renvoyer au Canada à mon magasin pour la vente. »

2. Expertise et contre-expertise

- Verdict de l'expertise : FAISABLE AVEC CONDITIONS — le parcours demandé est une pratique d'industrie établie (marque propre en petite série depuis la Chine) ; les outils existent ; la logistique de petits lots est rodée ; le cadre canadien, strict pour l'enfant, est connu et stable.
- Note : 62/100 — confirmée en contre-expertise. Vérifications refaites sur sources officielles : le Tarif des douanes de l'ASFC (chapitre 61) confirme les vêtements pour bébés (position 6111, enfants d'au plus 86 cm) en franchise (0 %) en NPF, contre 17–18 % pour l'adulte ; l'évaluation de Santé Canada confirme les règles sur les cordons (capuche et cou : nouveau-né à 12 ans ; norme ASTM F1816). Précision de la contre-expertise : le classement se fait modèle par modèle (tricot 6111, tissé 6209 — bébé en franchise dans les deux cas), et les coûts de marché cités dans l'étude sont des fourchettes documentées, à re-deviser au moment des commandes.
- Étude complète : etude-faisabilite-haute-couture_2026-11-07.md (dossier de l'équipe).

3. Objectif et utilisateurs

- Le client (propriétaire du magasin) : créer ses modèles (bébé, enfants, adultes) avec l'aide de l'application, produire ses dossiers techniques, suivre échantillons, production et expédition, et connaître son coût rendu magasin avant de commander.
- Le chef de projet : piloter la construction de l'application et le parcours d'approvisionnement, jalon par jalon, avec l'IA du projet.
- Principe directeur : démarrer petit et conforme — un premier lot réel vendu en magasin vaut plus qu'une grande collection sur papier.

4. Portée de la première version (proposition)

1. Bibliothèque de modèles : le client saisit ou dicte ses idées de vêtements ; l'IA l'aide à produire des concepts et des dessins présentables (l'IA produit des concepts, pas des patrons).
2. Fiches techniques (tech packs) générées : mesures, gradation des tailles (bébé / enfant / adulte), tissus, couleurs, finitions — avec le bloc conformité Canada intégré aux gabarits : étiquette bilingue avec numéro CA à coudre en usine, règles cordons de Santé Canada, avertissements d'inflammabilité.
3. Validation humaine du patron avant tout envoi en usine (modéliste) : aucun dessin seul ne part en production.
4. Calculateur de coût rendu : prix usine + fret + droits (distinction bébé 0 % / enfant et adulte 17–18 %) + taxes + inspection, par pièce, avec marge visée — aucun prix de détail figé avant réception du lot.
5. Suivi du parcours d'achat : échantillons (rondes), production, inspection avant solde, expédition (maritime LCL ou aérien), réception au magasin.
6. Périmètre de départ resserré : segment bébé + 1 à 2 modèles adultes ; enfant hors bébé et vêtements de nuit enfants exclus de la v1.
7. Chaîne d'achat protégée : commandes via Trade Assurance au démarrage, entente NNN signée avant l'envoi des dossiers techniques, inspection pré-expédition (AQL 2,5) avant le paiement du solde.

5. Hors portée de la première version

- Vêtements de nuit pour enfants (règlement d'inflammabilité propre — entrée après mise en place des tests de conformité).
- Modélisation 3D (type CLO) et patronage automatique.
- Vente en ligne et boutique (le client vend en magasin ; à rouvrir selon sa réponse à la question 6).
- Deuxième pays de fabrication.

6. Suggestions de l'équipe au chef de projet

1. Commencer par le bébé : 0 % de droits de douane, quantités minimales dès 100 pièces/couleur, modèles simples — c'est le segment de démarrage rationnel ; ajouter 1 modèle adulte témoin pour éprouver le calcul de coût rendu à 17–18 %.
2. Le tech pack est le goulot : fais valider chaque patron/gradation par un modéliste avant l'envoi en usine — l'étude montre que c'est ce qui fait passer les rondes d'échantillons d'environ 4,5 à 1,8.
3. Conformité dessinée, pas corrigée : étiquettes bilingues avec numéro CA cousues en usine ; aucun cordon capuche/cou sur les modèles enfants dès le dessin ; tests d'inflammabilité des tissus avant la première production.
4. Aucune exception à la chaîne protégée : Trade Assurance, NNN avant l'envoi des dessins, inspection avant le solde — même pour un petit lot « pour essayer ».
5. Pilote réel avant d'élargir : premier lot d'environ 300–600 pièces au total, vendu et analysé en magasin (taux de vente, marge réelle rendue) avant d'ajouter des modèles ou des segments. Calendrier : compter un cycle réel de 3 à 5 mois par collection — viser la saison en conséquence.

7. Décisions demandées au client (posées par l'équipe — le chef ne contacte pas le client directement)

1. Dans quelle province est le magasin ? (Québec → étiquetage français renforcé ; Ontario → régime fédéral bilingue standard.)
2. Quel budget de démarrage avant les premières ventes ?
3. Quels volumes annuels par modèle, et quelle rotation de stock le magasin supporte-t-il ? (Le minimum de 100 pièces/modèle doit être absorbable.)
4. A-t-il déjà une marque (nom, logo), déposée au Canada ? Le nom du magasin fera-t-il office de marque sur les étiquettes (numéro CA) ?
5. Quels tissus vise-t-il (coton, coton biologique certifié, synthétiques) ?
6. Veut-il aussi vendre en ligne, ou uniquement en magasin ?
7. Qui approuve les échantillons chez lui, et sur quels critères ?

8. Questions au chef de projet (à trancher avec l'équipe)

1. Modèle de validation du patron : modéliste freelance partenaire (coût au modèle), service de patronage, ou patronage par l'usine avec contrôle renforcé ? Qui paie les rondes supplémentaires ?
2. Route d'approvisionnement par défaut : Alibaba + Trade Assurance en direct par le client guidé par l'application, ou agent d'approvisionnement mandaté ?
3. Périmètre exact de la v1 : confirme-t-on l'exclusion de la 3D et l'intégration d'un seul générateur d'images au lancement ?
4. Qui tient le rôle « conformité » : gabarits et listes de contrôle dans l'application + revue humaine par modèle, ou revue externe pour le segment enfant ?
5. Calendrier cible : quelle saison vise la première collection vendable, en comptant le cycle de 3 à 5 mois ?

9. Déroulement

- Expertise : faite le 7 novembre 2026. Contre-expertise : faite le même jour, note confirmée. Cahier des charges : remis le même jour.
- Après les réponses du client (section 7) et du chef (section 8) : construction jalon par jalon, avec démonstration à chaque jalon.
- L'IA accompagnante fait le lien entre le client et le chef de projet à chaque étape ; la discussion du chef avec l'IA du projet se tient dans l'application OPC (écran « Mes projets ») — le courriel sert de notification.`;

const HAUTE_COUTURE_SUMMARY = `« J'ai un magasin où je vends des vêtements. J'aimerais que l'application m'aide à créer des vêtements pour bébé, des vêtements pour enfants, des vêtements pour adultes. Envoyer les dessins de vêtements créatifs en Chine pour la confection, faire exécuter en Chine, faire fabriquer ces vêtements, les renvoyer au Canada à mon magasin pour la vente. »`;

const HAUTE_COUTURE_BRIEF = `Portée v1 : bibliothèque de modèles (le client saisit ou dicte ses idées ; l'IA aide à produire concepts et dessins, jamais de patrons) ; fiches techniques (tech packs) générées — mesures, gradation des tailles bébé/enfant/adulte, tissus, couleurs, finitions — avec le bloc conformité Canada intégré aux gabarits (étiquette bilingue avec numéro CA cousue en usine, règles cordons de Santé Canada, inflammabilité) ; validation humaine du patron avant tout envoi en usine ; calculateur de coût rendu (droits : bébé 0 %, enfant et adulte 17–18 %) ; suivi échantillons, production, inspection avant solde, expédition ; démarrage resserré : segment bébé + 1 à 2 modèles adultes ; chaîne d'achat protégée (Trade Assurance, NNN avant l'envoi des dessins, inspection AQL 2,5 avant le solde).
Hors portée v1 : vêtements de nuit pour enfants, modélisation 3D et patronage automatique, vente en ligne, deuxième pays de fabrication.
Suggestions de l'équipe : commencer par le bébé (0 % de droits, minimum 100 pièces/couleur) + 1 modèle adulte témoin ; le tech pack est le goulot — validation par un modéliste à chaque modèle ; conformité dessinée dès le départ, pas corrigée ; pilote réel de 300–600 pièces vendues et analysées en magasin avant d'élargir ; cycle réel de 3 à 5 mois par collection.
Décisions en attente du client : province du magasin ; budget de démarrage ; volumes annuels par modèle ; marque existante (nom, logo, numéro CA) ; tissus visés ; vente en ligne ou magasin seulement ; qui approuve les échantillons.`;

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
      status: "en_attente_client",
      summary: HAUTE_COUTURE_SUMMARY,
      spec: HAUTE_COUTURE_SPEC,
      aiBrief: HAUTE_COUTURE_BRIEF,
      steps: [
        { label: "Projet reçu par l'équipe", state: "done" },
        { label: "Expertise de l'IA accompagnante, puis contre-expertise de l'équipe", state: "done" },
        { label: "Cahier des charges remis au chef de projet, avec les suggestions de l'équipe", state: "done" },
        { label: "Réponses du client (§7 du cahier) et du chef (§8), rapportées par l'équipe", state: "current" },
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

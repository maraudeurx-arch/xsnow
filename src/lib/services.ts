export const SERVICE_KINDS = [
  "courses",
  "demenagement",
  "garde",
  "pret",
] as const;

export type ServiceKind = (typeof SERVICE_KINDS)[number];
export type ListingSide = "offre" | "demande";
export type RateUnit = "course" | "heure" | "forfait" | "jour" | "pret";
export type CollateralStatus = "proposee" | "convenue" | "en_attente" | "liberee";

/** Listing shape ready to map 1:1 onto a future `/api/services` payload. */
export type ServiceListing = {
  id: string;
  service: ServiceKind;
  side: ListingSide;
  title: string;
  description: string;
  neighborhood: string;
  radiusKm: number;
  price: number;
  currency: string;
  rateUnit: RateUnit;
  objectName?: string;
  collateralAmount?: number;
  collateralCurrency?: string;
  collateralStatus?: CollateralStatus;
  createdAt: string;
};

export type CreateServiceListingInput = Omit<ServiceListing, "id" | "createdAt">;

export type ServiceDefinition = {
  kind: ServiceKind;
  href: string;
  title: string;
  short: string;
  lead: string;
  speech: string;
  rateUnits: RateUnit[];
  hasCollateral: boolean;
  storageKey: string;
};

export const SERVICES: Record<ServiceKind, ServiceDefinition> = {
  courses: {
    kind: "courses",
    href: "/services/courses",
    title: "Courses et livraison",
    short: "Courses & livraison",
    lead: "Offrez ou demandez une course, un colis ou une livraison de quartier. Le tarif est un accord entre voisins.",
    speech:
      "Courses et livraison. Publiez une offre ou une demande : quelqu’un du quartier peut faire vos courses, ou vous livrer un colis.",
    rateUnits: ["course", "heure"],
    hasCollateral: false,
    storageKey: "xsnow.services.courses",
  },
  demenagement: {
    kind: "demenagement",
    href: "/services/demenagement",
    title: "Aide au déménagement",
    short: "Déménagement",
    lead: "Besoin de bras, d’un camion, ou envie d’aider un voisin à déménager ? Publiez ici.",
    speech:
      "Aide au déménagement. Proposez vos bras ou demandez un coup de main pour cartons, piano et camionnette.",
    rateUnits: ["heure", "forfait"],
    hasCollateral: false,
    storageKey: "xsnow.services.demenagement",
  },
  garde: {
    kind: "garde",
    href: "/services/garde",
    title: "Garde d’enfants et d’animaux",
    short: "Garde",
    lead: "Garde d’enfants, promenade, chats et chiens : l’entraide payante du quartier, en toute clarté.",
    speech:
      "Garde d’enfants et d’animaux. Offrez vos heures, ou trouvez quelqu’un de confiance près de chez vous.",
    rateUnits: ["heure", "jour"],
    hasCollateral: false,
    storageKey: "xsnow.services.garde",
  },
  pret: {
    kind: "pret",
    href: "/services/pret",
    title: "Prêt / emprunt d’objets avec caution",
    short: "Prêt d’objets",
    lead: "Prêtez ou empruntez un objet. Une caution (dépôt) est convenue entre les parties. Aucun paiement n’est prélevé pour l’instant : la caution est un accord enregistré.",
    speech:
      "Prêt et emprunt d’objets. Indiquez l’objet et le montant de caution convenu. Le dépôt n’est pas encore débité : c’est un accord entre voisins.",
    rateUnits: ["pret", "jour"],
    hasCollateral: true,
    storageKey: "xsnow.services.pret",
  },
};

export const SERVICE_LIST = SERVICE_KINDS.map((kind) => SERVICES[kind]);

export const RATE_UNIT_LABEL: Record<RateUnit, string> = {
  course: "par course",
  heure: "de l’heure",
  forfait: "forfait",
  jour: "par jour",
  pret: "pour le prêt",
};

export const COLLATERAL_STATUS_LABEL: Record<CollateralStatus, string> = {
  proposee: "Caution proposée",
  convenue: "Caution convenue",
  en_attente: "Caution en attente",
  liberee: "Caution libérée",
};

export const CURRENCIES = ["CAD", "EUR", "USD"] as const;

export function isServiceKind(value: string): value is ServiceKind {
  return (SERVICE_KINDS as readonly string[]).includes(value);
}

export function formatMoney(amount: number, currency: string, locale = "fr-CA") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function sideLabel(side: ListingSide) {
  return side === "offre" ? "Offre" : "Demande";
}

function seedId(kind: ServiceKind, n: number) {
  return `seed-${kind}-${n}`;
}

export const SERVICE_SEEDS: Record<ServiceKind, ServiceListing[]> = {
  courses: [
    {
      id: seedId("courses", 1),
      service: "courses",
      side: "offre",
      title: "Courses du samedi — Plateau",
      description: "Je fais déjà mon épicerie le samedi matin. Je peux ajouter vos sacs, jusqu’à 4 sacs.",
      neighborhood: "Plateau-Mont-Royal",
      radiusKm: 3,
      price: 15,
      currency: "CAD",
      rateUnit: "course",
      createdAt: "2026-09-10T14:00:00.000Z",
    },
    {
      id: seedId("courses", 2),
      service: "courses",
      side: "demande",
      title: "Livraison pharmacie + lait",
      description: "Je ne peux pas sortir aujourd’hui. Pharmacie Jean-Coutu + 2 litres de lait.",
      neighborhood: "Rosemont",
      radiusKm: 2,
      price: 12,
      currency: "CAD",
      rateUnit: "course",
      createdAt: "2026-09-11T09:30:00.000Z",
    },
  ],
  demenagement: [
    {
      id: seedId("demenagement", 1),
      service: "demenagement",
      side: "demande",
      title: "3e étage sans ascenseur — 2h",
      description: "Canapé + 8 cartons. Camionnette déjà louée, il me manque deux personnes.",
      neighborhood: "Hochelaga",
      radiusKm: 5,
      price: 25,
      currency: "CAD",
      rateUnit: "heure",
      createdAt: "2026-09-09T18:00:00.000Z",
    },
    {
      id: seedId("demenagement", 2),
      service: "demenagement",
      side: "offre",
      title: "Bras + camionnette 8 pi",
      description: "Disponible en soirée et week-end. Je peux aussi aider à monter les meubles.",
      neighborhood: "Villeray",
      radiusKm: 8,
      price: 40,
      currency: "CAD",
      rateUnit: "heure",
      createdAt: "2026-09-08T12:00:00.000Z",
    },
  ],
  garde: [
    {
      id: seedId("garde", 1),
      service: "garde",
      side: "offre",
      title: "Garde enfants 5-10 ans",
      description: "BAFA, références de deux familles du quartier. Soirs de semaine.",
      neighborhood: "Outremont",
      radiusKm: 3,
      price: 18,
      currency: "CAD",
      rateUnit: "heure",
      createdAt: "2026-09-07T16:00:00.000Z",
    },
    {
      id: seedId("garde", 2),
      service: "garde",
      side: "demande",
      title: "Promenade chien (labrador)",
      description: "Milo, 3 ans, très sociable. 30 à 45 minutes en fin d’après-midi.",
      neighborhood: "Verdun",
      radiusKm: 2,
      price: 14,
      currency: "CAD",
      rateUnit: "heure",
      createdAt: "2026-09-12T11:15:00.000Z",
    },
  ],
  pret: [
    {
      id: seedId("pret", 1),
      service: "pret",
      side: "offre",
      title: "Perceuse + kit de mèches",
      description: "Bosch 18V. Week-end seulement. Remise avec les piles chargées.",
      neighborhood: "Petite-Patrie",
      radiusKm: 4,
      price: 0,
      currency: "CAD",
      rateUnit: "pret",
      objectName: "Perceuse Bosch 18V",
      collateralAmount: 80,
      collateralCurrency: "CAD",
      collateralStatus: "proposee",
      createdAt: "2026-09-06T10:00:00.000Z",
    },
    {
      id: seedId("pret", 2),
      service: "pret",
      side: "demande",
      title: "Emprunter une tente 4 places",
      description: "Week-end du 20 septembre, camping familial. Je peux laisser une caution.",
      neighborhood: "Ahuntsic",
      radiusKm: 10,
      price: 10,
      currency: "CAD",
      rateUnit: "jour",
      objectName: "Tente 4 places",
      collateralAmount: 120,
      collateralCurrency: "CAD",
      collateralStatus: "convenue",
      createdAt: "2026-09-05T19:40:00.000Z",
    },
  ],
};

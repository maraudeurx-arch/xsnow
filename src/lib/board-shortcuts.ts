/**
 * Full-width CTAs on Mes services / En demande.
 * Mes services → publish flows; En demande → demand/browse flows.
 * Car lending, moving help, and DIY help stay out of these catalogs.
 */

export const MES_SERVICE_SHORTCUTS = [
  {
    id: "cleaning",
    action: "link" as const,
    href: "/services/menage",
  },
  {
    id: "handyman",
    action: "link" as const,
    href: "/services/handyman",
  },
  {
    id: "babysitting",
    action: "link" as const,
    href: "/services/garde",
  },
  {
    id: "skills",
    action: "skills" as const,
    href: "/mes-services?template=skills",
  },
] as const;

export const EN_DEMANDE_SHORTCUTS = [
  {
    id: "cleaning",
    href: "/services/menage?side=demande",
  },
  {
    id: "handyman",
    href: "/services/handyman?side=demande",
  },
  {
    id: "carpool",
    href: "/en-demande?kind=car-morning",
  },
  {
    id: "equipment",
    href: "/services/pret?side=demande",
  },
] as const;

export type MesServiceShortcutId = (typeof MES_SERVICE_SHORTCUTS)[number]["id"];
export type EnDemandeShortcutId = (typeof EN_DEMANDE_SHORTCUTS)[number]["id"];

/**
 * Full-width CTAs on Mes services / En demande.
 * Mes services → publish flows; En demande → demand/browse flows.
 */

export const MES_SERVICE_SHORTCUTS = [
  {
    id: "lend-car",
    /** Opens the local car-morning offer form on Mes services. */
    action: "car_morning" as const,
    href: "/mes-services?template=car-morning",
  },
  {
    id: "moving",
    action: "link" as const,
    href: "/services/demenagement",
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
    id: "moving",
    href: "/services/demenagement?side=demande",
  },
  {
    id: "diy",
    href: "/services/pret?side=demande&title=Aide%20au%20bricolage&object=Outils%20de%20bricolage",
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

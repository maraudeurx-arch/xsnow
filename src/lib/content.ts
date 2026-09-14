/** City / gentilé — later swapped from user location. */
export const LOCATION = {
  city: "GATINEAU",
  locationLabel: "Gatinois",
} as const;

export const BRAND = {
  name: LOCATION.city,
  community: "Open-Community",
  slogan: "Monétisé Vous!",
  footerBefore: "Proximité et Esprit d’entraide au service des ",
  footerAfter: ".",
  watermark: "EN CONSTRUCTION",
} as const;

export const BUBBLE_INTRO =
  "Bonjour ! Je suis votre guide. Touchez Accueil, sous GATINEAU à gauche, pour choisir une proposition. Réécouter : je vous les présente.";

export const WELCOME_SPEECH =
  "Bonjour ! Je suis votre guide GATINEAU. Touchez Accueil, juste sous GATINEAU à gauche, pour voir toutes les propositions. Vous pourrez faire connaître votre business, voir qui est à proximité, retrouver un téléphone perdu, ou être alerté si un proche s’éloigne. Dans Accueil aussi : Reportage, Séries TV, Dessins animés, Vos attributs. Et les services : courses et livraison, aide au déménagement, garde d’enfants et d’animaux, prêt ou emprunt d’objets avec caution. Choisissez une option. Monétisé Vous !";

export const LEFT_MENU = [
  {
    href: "/business",
    label: "Faites connaître votre business",
    speech:
      "Parfait. Faites connaître votre business à la communauté. Décrivez votre commerce, votre quartier, et on le met en lumière.",
  },
  {
    href: "/proximite",
    label: "Voyez qui est à proximité",
    speech:
      "Voyons qui est à proximité. Activez votre position pour rencontrer voisins et commerces tout près de vous.",
  },
  {
    href: "/telephone",
    label: "Retrouve ton téléphone perdu",
    speech:
      "On va t’aider à retrouver ton téléphone perdu. Décris l’appareil et le dernier endroit vu : la communauté reste aux aguets.",
  },
  {
    href: "/alertes",
    label:
      "Sois alerté si ton enfant, ton mari, tes grands-parents s’éloignent de l’endroit où ils doivent être",
    speech:
      "Ici, tu crées une zone de confiance. Si ton enfant, ton mari ou tes grands-parents s’éloignent de l’endroit où ils doivent être, tu seras alerté.",
  },
] as const;

export const ACCUEIL_MENU = [
  {
    href: "/reportage",
    label: "Reportage",
    speech:
      "Reportage : les récits de notre communauté. Des voisins qui s’entraident, des commerces qui tiennent le coup, des histoires vraies.",
  },
  {
    href: "/series",
    label: "Séries TV",
    speech:
      "Séries TV : des feuilleton locaux produits par Open-Community. Installe-toi, c’est chez nous.",
  },
  {
    href: "/dessins-animes",
    label: "Dessins animés",
    speech:
      "Dessins animés : des histoires douces pour les enfants de la communauté, sans pub invasive.",
  },
  {
    href: "/attributs",
    label: "Vos attributs",
    speech:
      "Vos attributs : dites à la communauté qui vous êtes — voisin, commerçant, bénévole, parent — pour mieux s’entraider.",
  },
] as const;

export const FEATURE_COPY = {
  business: {
    title: "Faites connaître votre business",
    lead: "Publiez votre commerce dans Open-Community. Les voisins vous trouvent, vous les servez.",
  },
  proximite: {
    title: "Voyez qui est à proximité",
    lead: "Une carte humaine de votre quartier : voisins, commerces, entraide.",
  },
  telephone: {
    title: "Retrouve ton téléphone perdu",
    lead: "Signalez l’appareil. La proximité de GATINEAU devient un filet de sécurité.",
  },
  alertes: {
    title: "Alertes de proximité",
    lead: "Recevez une alerte si un proche s’éloigne de la zone où il doit être.",
  },
  reportage: {
    title: "Reportage",
    lead: "Les reportages d’Open-Community : la vie de quartier, sans filtre corporate.",
  },
  series: {
    title: "Séries TV",
    lead: "Des séries nées ici, pour ici. Bientôt à l’antenne communautaire.",
  },
  dessins: {
    title: "Dessins animés",
    lead: "Des dessins animés bienveillants, pensés pour les familles du quartier.",
  },
  attributs: {
    title: "Vos attributs",
    lead: "Vos étiquettes d’entraide. Elles restent sur cet appareil, chez vous.",
  },
  services: {
    title: "Services Open-Community",
    lead: "Les premiers services monétisables du quartier : courses, déménagement, garde et prêt d’objets avec caution.",
  },
} as const;

export const BRAND = {
  name: "Xsnow",
  community: "Open-Community",
  slogan: "Monétisé Vous!",
  footer:
    "Notre Proximité et notre esprit d’entraide est le gage de notre succès!",
  watermark: "EN CONSTRUCTION",
} as const;

export const WELCOME_SPEECH =
  "Bonjour ! Je suis votre guide Xsnow. Choisissez un menu à gauche, explorez les Services Open-Community — courses, déménagement, garde et prêt d’objets — ou touchez Accueil pour Reportage, Séries TV, Dessins animés et Vos attributs. Monétisé Vous !";

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
    lead: "Signalez l’appareil. La proximité de Xsnow devient un filet de sécurité.",
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

/** City / gentilé — later swapped from user location. */
export const LOCATION = {
  city: "GATINEAU",
  locationLabel: "Gatinois",
} as const;

export const BRAND = {
  name: LOCATION.city,
  community: "Open Community",
  slogan: "Monétisé Vous!",
  footerBefore: "Proximité et Esprit d’entraide au service des ",
  footerAfter: ".",
  watermark: "EN CONSTRUCTION",
} as const;

export const WELCOME_SPEECH =
  "Bonjour, je suis ton avatar dans l’écosystème Open Community. La proximité et l’esprit d’entraide des gens de Gatineau font notre force. Fais connaître à tes voisins un service que tu peux leur rendre en échange d’une compensation : ça peut être aider à déménager, faire des courses, ou aider à des travaux dans la maison. De plus, cette application t’offre des services gratuits, comme t’aider à retrouver ton téléphone si tu le perds, et t’avertir si ton enfant, ton conjoint ou tes parents âgés s’éloignent de l’endroit où ils sont censés être : l’école, le travail, ou la maison de retraite. Va dans Accueil et choisis le service dont tu aimerais bénéficier, ou que tu voudrais offrir à tes voisins de Gatineau. N’hésitez pas à me questionner à tout moment, je suis à votre entière disposition.";

export const AVATAR_CHAT = {
  title: "Parle à ton avatar",
  placeholder: "Écris à ton avatar…",
  send: "Envoyer",
  settings: "Réglages LLM",
  apiKeyLabel: "Clé API LLM (gratuite)",
  apiKeyHint:
    "La clé reste dans cet appareil (localStorage). Elle n’est jamais envoyée vers GitHub Pages.",
  apiKeyHelp: "Créer une clé gratuite Moonshot / Kimi",
  apiKeyHelpUrl: "https://platform.kimi.ai/console/api-keys",
  baseUrlLabel: "URL de l’API (OpenAI-compatible)",
  modelLabel: "Modèle",
  save: "Enregistrer",
  empty:
    "Pour discuter, ajoute une clé API gratuite Moonshot / Kimi. Ton avatar pourra alors t’aider pour les courses, un déménagement, la garde, un prêt d’objet, un téléphone perdu ou une alerte de proximité.",
  missingKey: "Ajoute d’abord ta clé API dans les réglages.",
  networkError:
    "Impossible de joindre l’API depuis Safari. Vérifie la clé, ou colle une URL OpenAI-compatible qui autorise ce site (CORS).",
  genericError: "L’avatar n’a pas pu répondre. Réessaie dans un instant.",
} as const;

export const AVATAR_SYSTEM_PROMPT =
  "Tu es l’avatar du visiteur dans Open Community, à Gatineau. Tu parles uniquement en français, tu tutoies, tu restes chaleureux, concret et bref. Tu aides sur l’entraide de quartier : courses et livraison, aide au déménagement, travaux à la maison, garde d’enfants ou d’animaux, prêt ou emprunt d’objets, téléphone perdu, alertes si un enfant, un conjoint ou des parents âgés s’éloignent (école, travail, maison de retraite). Tu invites à toucher Accueil, sous GATINEAU à gauche, pour choisir un service à offrir ou à recevoir. Tu ne prétends pas être un humain. En cas d’urgence réelle, oriente vers le 911. Tu es à la disposition du visiteur pour toute question sur Open Community.";

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
      "Séries TV : des feuilleton locaux produits par Open Community. Installe-toi, c’est chez nous.",
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
    lead: "Publiez votre commerce dans Open Community. Les voisins vous trouvent, vous les servez.",
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
    lead: "Les reportages d’Open Community : la vie de quartier, sans filtre corporate.",
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
    title: "Services Open Community",
    lead: "Les premiers services monétisables du quartier : courses, déménagement, garde et prêt d’objets avec caution.",
  },
} as const;

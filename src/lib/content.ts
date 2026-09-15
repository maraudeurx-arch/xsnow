import { DEFAULT_LOCALE, getMessages, interpolate, type Locale } from "./i18n";

/** Fallback city / gentilé — live branding comes from `usePlace()`. */
export const LOCATION = {
  city: "Gatineau",
  cityDisplay: "GATINEAU",
  locationLabel: "Gatinois",
} as const;

export const BRAND = {
  name: LOCATION.cityDisplay,
  community: "Open Community",
  slogan: "Monétisé Vous!",
  footerBefore: "Proximité et Esprit d’entraide au service des ",
  footerAfter: ".",
} as const;

export function welcomeSpeechFor(city: string, locale: Locale = DEFAULT_LOCALE) {
  return interpolate(getMessages(locale).welcome, { city });
}

export const WELCOME_SPEECH = welcomeSpeechFor(LOCATION.city);

export const AVATAR_CHAT = {
  title: "Parle à ton avatar",
  placeholder: "Écris à ton avatar…",
  send: "Envoyer",
  speak: "Parler",
  listening: "J’écoute…",
  networkError: "Impossible de joindre l’avatar pour le moment. Réessaie dans un instant.",
  genericError: "L’avatar n’a pas pu répondre. Réessaie dans un instant.",
  micUnsupported:
    "La dictée n’est pas disponible sur cet appareil. Écris ton message — le clavier reste toujours là.",
  micPermission:
    "Accès au micro refusé. Sur iPhone : Réglages → Safari → Microphone, ou écris ton message.",
  micSilent: "Je n’ai rien entendu. Réessaie « Parler », ou écris ton message.",
  micNetwork: "Dictée indisponible pour le moment. Écris ton message.",
  micError: "Impossible d’écouter pour le moment. Écris ton message.",
} as const;

export function avatarSystemPromptFor(
  city: string,
  placeName: string,
  locale: Locale = DEFAULT_LOCALE,
  avatar = "",
) {
  return interpolate(getMessages(locale).systemPrompt, { city, placeName, avatar });
}

export const AVATAR_SYSTEM_PROMPT = avatarSystemPromptFor(
  LOCATION.city,
  LOCATION.cityDisplay,
);

export const COMMUNITY_MENU = [
  {
    href: "/proximite",
    label: "Voyez qui est à proximité",
    speech:
      "Voyons qui est à proximité. Activez votre position pour rencontrer voisins et commerces tout près de vous.",
  },
] as const;

export const SAFETY_SERVICES_MENU = [
  {
    href: "/telephone",
    label: "Retrouve ton téléphone perdu",
    speech:
      "On va t’aider à retrouver ton téléphone perdu. Décris l’appareil et le dernier endroit vu : la communauté reste aux aguets.",
  },
  {
    href: "/alertes",
    label:
      "Sois alerté si ton enfant, ton conjoint ou tes parents âgés s’éloignent de l’endroit où ils sont censés être",
    speech:
      "Ici, tu crées une zone de confiance. Si ton enfant, ton conjoint ou tes parents âgés s’éloignent de l’endroit où ils sont censés être, tu seras alerté.",
  },
] as const;

export const PROFESSIONNELLE_MENU = [
  {
    href: "/business",
    label: "Faites connaître votre business par des pubs",
    speech:
      "Faites connaître votre business par des pubs dans Open Community. Décrivez votre commerce, votre quartier, et on le met en lumière.",
  },
  {
    href: "/monetise",
    label: "Monétiser vous : votre image, votre voix.",
    speech:
      "Monétiser vous : votre image, votre voix. Proposez votre présence à la communauté de votre ville.",
  },
  {
    href: "/sondages",
    label: "Répondre à des sondages et gagner de l’argent",
    speech:
      "Répondez à des sondages de quartier et gagnez de l’argent. Bientôt dans Open Community.",
  },
] as const;

export const HEADER_NAV = [
  { href: "/mes-services", label: "Mes services" },
  { href: "/en-demande", label: "En demande" },
  { href: "/mon-profil", label: "Mon profil" },
] as const;

export const COMING_SOON_2027_TITLE = "En construction pour 2027 :";

export const ACCUEIL_MENU = [
  {
    href: "/reportage",
    label: "Avec l’IA, crée des reportages sur votre quartier",
    speech:
      "Avec l’IA, crée des reportages sur votre quartier. Un studio communautaire arrive en 2027.",
  },
  {
    href: "/scenarios",
    label: "Crée des scénarios humour / animé",
    speech:
      "Crée des scénarios humour ou animé. Un atelier créatif arrive en 2027.",
  },
] as const;

export const FEATURE_COPY = {
  business: {
    title: "Faites connaître votre business par des pubs",
    lead: "Publiez une pub locale dans Open Community. Les voisins vous trouvent, vous les servez.",
  },
  proximite: {
    title: "Voyez qui est à proximité",
    lead: "Une carte humaine de votre quartier : voisins, commerces, entraide.",
  },
  telephone: {
    title: "Retrouve ton téléphone perdu",
    lead: "Signalez l’appareil. La proximité de votre ville devient un filet de sécurité.",
  },
  alertes: {
    title: "Alertes de proximité",
    lead: "Recevez une alerte si un enfant, un conjoint ou des parents âgés s’éloignent de la zone où ils doivent être.",
  },
  reportage: {
    title: "Avec l’IA, crée des reportages sur votre quartier",
    lead: "Un studio IA pour raconter votre rue, vos voisins, votre commerce. Prévu pour 2027.",
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
    lead: "Les services de sécurité du quartier : téléphone perdu et alertes si un proche s’éloigne.",
  },
  monetise: {
    title: "Monétiser vous : votre image, votre voix.",
    lead: "Proposez votre image ou votre voix à la communauté. Bientôt branché sur vos services.",
  },
  sondages: {
    title: "Répondre à des sondages et gagner de l’argent",
    lead: "Des sondages locaux, une compensation claire. En construction.",
  },
  scenarios: {
    title: "Crée des scénarios humour / animé",
    lead: "Inventez des sketches et des dessins animés communautaires. Prévu pour 2027.",
  },
  mesServices: {
    title: "Mes services",
    lead: "Ici, vous verrez ce que vous offrez déjà à la communauté : pubs, services, objets. En construction.",
  },
  enDemande: {
    title: "En demande",
    lead: "Les demandes du quartier que vous pourriez honorer. En construction.",
  },
  monProfil: {
    title: "Mon profil",
    lead: "Votre fiche locale : infos, réglages, invitations.",
  },
  mesInfos: {
    title: "Mes infos",
    lead: "Vos coordonnées et votre portefeuille restent sur cet appareil.",
  },
  reglages: {
    title: "Réglages",
    lead: "Préférences d’affichage et de notifications. En construction.",
  },
  inviter: {
    title: "Inviter d’autres à rejoindre la communauté",
    lead: "Partagez Open Community avec un voisin, un commerce, une famille.",
  },
  aPropos: {
    title: "À propos de Open Community (OPC)",
    lead: "Proximité, entraide et visibilité locale — Monétisé Vous!",
  },
} as const;

export const PROFILE_MENU = [
  { href: "/mon-profil/infos", label: "Mes infos" },
  { href: "/mon-profil/reglages", label: "Réglages" },
  {
    href: "/mon-profil/inviter",
    label: "Inviter d’autres à rejoindre la communauté",
  },
  {
    href: "/mon-profil/a-propos",
    label: "À propos de Open Community (OPC)",
  },
] as const;

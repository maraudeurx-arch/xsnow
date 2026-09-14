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
} as const;

export const WELCOME_SPEECH =
  "Bonjour, je suis ton avatar dans l’écosystème Open Community. La proximité et l’esprit d’entraide des gens de Gatineau font notre force. Fais connaître à tes voisins un service que tu peux leur rendre en échange d’une compensation : ça peut être aider à déménager, faire des courses, ou aider à des travaux dans la maison. De plus, cette application t’offre des services gratuits, comme t’aider à retrouver ton téléphone si tu le perds, et t’avertir si ton enfant, ton conjoint ou tes parents âgés s’éloignent de l’endroit où ils sont censés être : l’école, le travail, ou la maison de retraite. Va dans Accueil et choisis le service dont tu aimerais bénéficier, ou que tu voudrais offrir à tes voisins de Gatineau. N’hésitez pas à me questionner à tout moment, je suis à votre entière disposition.";

export const AVATAR_CHAT = {
  title: "Parle à ton avatar",
  placeholder: "Écris à ton avatar…",
  send: "Envoyer",
  mic: "Parler",
  micListening: "J’écoute…",
  micUnsupported:
    "La dictée n’est pas disponible sur cet appareil. Écris ton message.",
  micDenied:
    "Le micro n’est pas autorisé. Active-le dans Réglages → Safari, ou écris ton message.",
  micNoSpeech: "Je n’ai rien entendu. Touche Parler et réessaie, ou écris ton message.",
  micCapture: "Impossible d’accéder au micro. Écris ton message.",
  micGeneric: "La dictée a échoué. Écris ton message.",
  micLangRetry: "Cette langue n’est pas disponible. Touche Parler à nouveau.",
  voiceOn: "Voix",
  voiceOff: "Muet",
  listenReply: "Écouter la réponse",
  authRequired: "Connexion rapide requise pour discuter. Réessaie après t’être connecté.",
  networkError: "Impossible de joindre l’avatar pour le moment. Réessaie dans un instant.",
  genericError: "L’avatar n’a pas pu répondre. Réessaie dans un instant.",
} as const;

export const AVATAR_SYSTEM_PROMPT =
  "Tu es l’avatar du visiteur dans Open Community, à Gatineau. Tu parles uniquement en français, tu tutoies, tu restes chaleureux, concret et bref. Tu aides sur l’entraide de quartier : courses et livraison, aide au déménagement, travaux à la maison, garde d’enfants ou d’animaux, prêt ou emprunt d’objets, téléphone perdu, alertes si un enfant, un conjoint ou des parents âgés s’éloignent (école, travail, maison de retraite). Tu invites à toucher Accueil, sous GATINEAU à gauche, pour choisir un service à offrir ou à recevoir. Tu ne prétends pas être un humain. En cas d’urgence réelle, oriente vers le 911. Tu es à la disposition du visiteur pour toute question sur Open Community.";

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
      "Monétiser vous : votre image, votre voix. Proposez votre présence à la communauté de Gatineau.",
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
    lead: "Signalez l’appareil. La proximité de GATINEAU devient un filet de sécurité.",
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
    lead: "Votre fiche Gatineau : infos, réglages, invitations.",
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

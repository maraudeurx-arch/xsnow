export const fr = {
  brand: {
    community: "Open Community",
    slogan: "Monétisé Vous!",
  },
  nav: {
    accueil: "Accueil",
    accueilProposals: "Propositions Accueil",
    mesServices: "Mes services",
    enDemande: "En demande",
    monProfil: "Mon profil",
    main: "Navigation principale",
  },
  menu: {
    communaute: "Communauté",
    services: "Services",
    professionnelle: "Professionnelle",
    coming2027: "En construction pour 2027 :",
    proximite: "Voyez qui est à proximité",
    telephone: "Retrouve ton téléphone perdu",
    alertes:
      "Sois alerté si ton enfant, ton conjoint ou tes parents âgés s’éloignent de l’endroit où ils sont censés être",
    business: "Faites connaître votre business par des pubs",
    monetise: "Monétiser vous : votre image, votre voix.",
    sondages: "Répondre à des sondages et gagner de l’argent",
    reportage: "Avec l’IA, crée des reportages sur votre quartier",
    scenarios: "Crée des scénarios humour / animé",
  },
  guide: {
    pickAvatar: "Choisis ton avatar",
    changeAvatar: "Changer d’avatar",
    replay: "Réécouter",
    avatars: {
      "homme-blanc": "Homme, peau claire",
      "femme-blanche": "Femme, peau claire",
      "homme-noir": "Homme, peau foncée",
      "femme-noire": "Femme, peau foncée",
    },
    alts: {
      "homme-blanc": "Avatar d’un homme à la peau claire, cheveux bruns, t-shirt bleu",
      "femme-blanche": "Avatar d’une femme à la peau claire, cheveux châtains, pull beige",
      "homme-noir": "Avatar d’un homme à la peau foncée, lunettes et barbe, veste camel",
      "femme-noire": "Avatar d’une femme à la peau foncée, cheveux bouclés, pull moutarde",
    },
  },
  chat: {
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
  },
  geo: {
    section: "Autoriser la position",
    title: "Où es-tu en ce moment ?",
    body: "Autorise ta position pour afficher le nom de ta ville (et, plus tard, tes voisins à proximité). Rien n’est envoyé à un serveur de suivi — seulement ta ville, sur cet appareil.",
    allow: "Autoriser ma position",
    locating: "Recherche de ta ville…",
    skip: "Plus tard — rester à Gatineau",
    errors: {
      unsupported:
        "La géolocalisation n’est pas disponible sur cet appareil. Tu peux continuer avec Gatineau.",
      generic: "Impossible d’obtenir ta position. Tu peux réessayer, ou continuer avec Gatineau.",
      denied:
        "Safari a refusé la position. Dans Réglages → Safari → Localisation, ou continue avec Gatineau.",
      timeout: "La position a pris trop de temps. Réessaie, ou continue avec Gatineau.",
      unavailable: "Position indisponible pour le moment. Réessaie, ou continue avec Gatineau.",
    },
  },
  consent: {
    title: "Tes choix, sur cet appareil",
    intro: "Deux options. L’app marche même si tu dis non.",
    locationTitle: "Position — optionnelle",
    locationBody: "Nom de ta ville à l’écran, plus tard proximité / famille. Non = {city}.",
    locationYes: "Oui",
    locationNo: "Non — {city}",
    analyticsTitle: "Stats anonymes — optionnelles",
    analyticsBody: "Session, langue, ville si tu as accepté, idées de services. Pour améliorer l’app.",
    analyticsYes: "Oui",
    analyticsNo: "Non",
    privacy: "Vie privée",
    changeLater: "Modifiable dans Mon profil → Réglages.",
  },
  legal: {
    privacy: {
      title: "Vie privée",
      lead: "Ce que Open Community collecte — et ce qu’elle ne fait pas.",
      draft:
        "Brouillon pour le produit communautaire, pas un avis juridique. Nous tenons compte de la LPRPDE (PIPEDA, Canada) et de la Loi 25 du Québec : consentement, limitation des finalités, conservation limitée.",
      updated: "Dernière mise à jour : septembre 2026",
      sections: [
        {
          heading: "Qui nous sommes",
          body: "Open Community (OPC) / Xsnow est une app d’entraide de quartier, affichée avec le nom de ta ville. Site statique sur GitHub Pages. Aucun compte e-mail obligatoire.",
        },
        {
          heading: "Ce que nous collectons",
          body: "Sur cet appareil (localStorage) : langue, avatar, tes annonces, tes consentements, et si tu acceptes la position : ville + coordonnées pour le nom de ville — pas de suivi continu. Si tu acceptes les stats : événements anonymes vers un Worker Cloudflare (D1) : session, langue, ville/pays si la position est aussi acceptée, extraits d’idées de monétisation (texte court ; e-mails et GPS retirés). Le chat de l’avatar envoie tes messages au Worker pour une réponse. Pas de pub tierce.",
        },
        {
          heading: "Pourquoi",
          body: "Améliorer le produit et la croissance de la communauté, et afficher ta ville dans l’interface. Pas de cookies publicitaires : il n’y en a pas.",
        },
        {
          heading: "Ce que nous ne faisons pas",
          body: "Nous ne vendons pas de données personnelles. Pas de suivi GPS continu sans consentement. Pas de revente à des annonceurs. Tu peux tout refuser et quand même utiliser l’app (ville de secours : Gatineau).",
        },
        {
          heading: "Consentement (Canada / Québec)",
          body: "Nous demandons un accord clair avant la permission de position du navigateur et avant d’envoyer des stats. Finalités limitées à celles décrites ici. Tu peux changer d’avis dans Réglages. Ceci décrit notre intention vis-à-vis de la LPRPDE et de la Loi 25 — ce n’est pas un avis juridique.",
        },
        {
          heading: "Conservation",
          body: "Données locales : jusqu’à ce que tu les effaces (données du site) ou que tu révoques un choix. Stats : pour améliorer le produit, sans GPS. Révoquer les stats arrête les envois.",
        },
      ],
    },
    terms: {
      title: "Conditions",
      lead: "Règles courtes du MVP communautaire.",
      draft: "Brouillon pour la communauté, pas un contrat rédigé par un avocat.",
      updated: "Dernière mise à jour : septembre 2026",
      sections: [
        {
          heading: "L’app",
          body: "Open Community aide les voisins à s’entraider et, plus tard, à monétiser des services locaux. C’est un produit en construction.",
        },
        {
          heading: "Tes annonces",
          body: "Pour l’instant, tes offres et demandes restent sur cet appareil. Un accord entre voisins n’est pas un contrat avec OPC. La caution d’un prêt est un accord affiché, pas un vrai dépôt en ligne.",
        },
        {
          heading: "Urgences",
          body: "Ceci n’est pas un service d’urgence. En cas de danger, compose le 911.",
        },
        {
          heading: "Portefeuille",
          body: "Connecter un portefeuille est optionnel (réseau de test Sepolia).",
        },
        {
          heading: "Usage",
          body: "Pas d’usage illégal, pas de harcèlement. Respecte tes voisins. Les contenus et services restent ta responsabilité.",
        },
        {
          heading: "Limite",
          body: "Le service est fourni tel quel. Nous pouvons changer ou interrompre des fonctions. Voir aussi Vie privée pour les données.",
        },
      ],
    },
    about: {
      extra:
        "Open Community (OPC) est un projet d’entraide de quartier : services entre voisins, visibilité locale, et plus tard des alertes de proximité. Le nom de ta ville s’affiche si tu acceptes la position ; sinon nous utilisons Gatineau. Nous demandons ton accord avant la géolocalisation et avant les stats anonymes. Tu peux tout refuser et utiliser l’app. Texte fourni à titre informatif, pas un avis juridique.",
    },
  },
  footer: {
    before: "Proximité et Esprit d’entraide au service des ",
    after: ".",
    privacy: "Vie privée",
    terms: "Conditions",
  },
  welcome:
    "Bonjour, je suis ton avatar dans l’écosystème Open Community. La proximité et l’esprit d’entraide des gens de {city} font notre force. Fais connaître à tes voisins un service que tu peux leur rendre en échange d’une compensation : ça peut être aider à déménager, faire des courses, ou aider à des travaux dans la maison. De plus, cette application t’offre des services gratuits, comme t’aider à retrouver ton téléphone si tu le perds, et t’avertir si ton enfant, ton conjoint ou tes parents âgés s’éloignent de l’endroit où ils sont censés être : l’école, le travail, ou la maison de retraite. Va dans Accueil et choisis le service dont tu aimerais bénéficier, ou que tu voudrais offrir à tes voisins de {city}. Avez-vous des suggestions de tâches et de services que vous aimeriez monétiser ? Faites-moi savoir, et toute la communauté en profitera. De plus, les gens qui partagent cette application, et des idées qui sont monétisées, recevront au prorata de leurs efforts. N’hésitez pas à me questionner à tout moment, je suis à votre entière disposition.",
  systemPrompt:
    "Tu es l’avatar du visiteur dans Open Community, à {city}. Tu parles uniquement en français, tu tutoies, tu restes chaleureux, concret et bref. Tu aides sur l’entraide de quartier : courses et livraison, aide au déménagement, travaux à la maison, garde d’enfants ou d’animaux, prêt ou emprunt d’objets, téléphone perdu, alertes si un enfant, un conjoint ou des parents âgés s’éloignent (école, travail, maison de retraite). Tu invites à toucher Accueil, sous {placeName} à gauche, pour choisir un service à offrir ou à recevoir. Tu ne prétends pas être un humain. En cas d’urgence réelle, oriente vers le 911. Tu es à la disposition du visiteur pour toute question sur Open Community. Ton apparence : {avatar}.",
  features: {
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
      lead: "Langue, position et stats d’usage. Tes choix restent sur cet appareil.",
    },
    inviter: {
      title: "Inviter d’autres à rejoindre la communauté",
      lead: "Partagez Open Community avec un voisin, un commerce, une famille.",
    },
    aPropos: {
      title: "À propos de Open Community (OPC)",
      lead: "Proximité, entraide et visibilité locale — Monétisé Vous!",
    },
  },
  profile: {
    infos: "Mes infos",
    reglages: "Réglages",
    inviter: "Inviter d’autres à rejoindre la communauté",
    aPropos: "À propos de Open Community (OPC)",
    infosBody: "Vos coordonnées et votre portefeuille restent sur cet appareil.",
    reglagesHint: "La langue choisie est enregistrée sur cet appareil. Elle remplace la langue du téléphone.",
    inviterBody: "Partagez Open Community avec un voisin, un commerce, une famille.",
    aProposBody:
      "{placeName} / {community} — {slogan} Notre proximité et notre esprit d’entraide est le gage de notre succès.",
    language: "Langue",
    comingSoon: "Notifications et saison d’affichage arriveront ici.",
    locationConsent: "Position",
    locationHint:
      "Pour le nom de ta ville et, plus tard, la proximité. Désactiver : on revient à Gatineau.",
    analyticsConsent: "Stats d’usage anonymes",
    analyticsHint: "Session, langue, ville/pays si la position est acceptée, idées de monétisation.",
    privacy: "Vie privée",
    terms: "Conditions",
    enabled: "Activé",
    disabled: "Désactivé",
  },
  stubs: {
    mesInfos:
      "Nom, quartier et attributs s’afficheront ici. En attendant, vous pouvez connecter un portefeuille — ce n’est pas obligatoire.",
    inviter:
      "Un lien d’invitation et un QR apparaîtront ici. Pour l’instant, parlez d’Open Community à un voisin.",
    monetise:
      "Bientôt : proposez votre image ou votre voix à monétiser. En attendant, ouvrez Accueil → Professionnelle.",
    scenarios:
      "Un atelier pour inventer des sketches et des dessins animés communautaires. Prévu pour 2027.",
    sondages:
      "Des sondages de quartier, une compensation claire. En construction pour bientôt.",
    mesServices:
      "La liste de ce que vous offrez déjà — pubs, services, objets — s’affichera ici.",
    enDemande:
      "Les demandes du quartier — un coup de main, une course, une garde — apparaîtront ici pour que vous puissiez y répondre.",
  },
  settings: {
    languages: {
      fr: "Français",
      en: "English",
      es: "Español",
    },
  },
  wallet: {
    connect: "Connect",
    disconnect: "Déconnecter le portefeuille",
    connectAria: "Connecter le portefeuille",
    guest: "Invité · Sepolia",
    wrongNetwork: "Mauvais réseau",
  },
  notFound: {
    title: "Page introuvable",
    back: "Retour à Accueil",
  },
  logoAria: "Open Community",
  services: {
    courses: {
      title: "Courses et livraison",
      short: "Courses & livraison",
      lead: "Offrez ou demandez une course, un colis ou une livraison de quartier. Le tarif est un accord entre voisins.",
    },
    demenagement: {
      title: "Aide au déménagement",
      short: "Déménagement",
      lead: "Besoin de bras, d’un camion, ou envie d’aider un voisin à déménager ? Publiez ici.",
    },
    garde: {
      title: "Garde d’enfants et d’animaux",
      short: "Garde",
      lead: "Garde d’enfants, promenade, chats et chiens : l’entraide payante du quartier, en toute clarté.",
    },
    pret: {
      title: "Prêt / emprunt d’objets avec caution",
      short: "Prêt d’objets",
      lead: "Prêtez ou empruntez un objet. Une caution (dépôt) est convenue entre les parties. Aucun paiement n’est prélevé pour l’instant : la caution est un accord enregistré.",
    },
    listingType: "Type d’annonce",
    offer: "Offre",
    request: "Demande",
    offers: "Offres",
    requests: "Demandes",
    all: "Toutes",
    title: "Titre",
    titlePh: "Ex. Courses du samedi",
    object: "Objet prêté ou emprunté",
    objectPh: "Perceuse, tente, vélo…",
    objectLine: "Objet : {name}",
    description: "Description",
    neighborhood: "Quartier",
    neighborhoodPh: "Plateau, Rosemont…",
    radius: "Rayon",
    price: "Tarif",
    currency: "Devise",
    unit: "Unité",
    collateralNote:
      "Caution (dépôt) : montant convenu entre les parties. Aucun paiement n’est prélevé pour l’instant — l’accord est seulement enregistré.",
    collateralAmount: "Montant de la caution",
    collateralCurrency: "Devise de la caution",
    publish: "Publier dans Open Community",
    saved: "Annonce enregistrée sur cet appareil. Une API pourra la reprendre plus tard.",
    free: "Gratuit",
    empty: "Aucune annonce pour ce filtre.",
    collateralLine: "Caution {amount} · {status} (accord, pas d’escrow réel)",
    rate: {
      course: "par course",
      heure: "de l’heure",
      forfait: "forfait",
      jour: "par jour",
      pret: "pour le prêt",
    },
    collateralStatus: {
      proposee: "Caution proposée",
      convenue: "Caution convenue",
      en_attente: "Caution en attente",
      liberee: "Caution libérée",
    },
  },
  business: {
    name: "Nom du commerce",
    category: "Catégorie",
    categoryPh: "Café, réparation, services…",
    city: "Ville ou quartier",
    cityPh: "Plateau, Rosemont…",
    description: "Description",
    publish: "Publier dans Open Community",
    saved: "Enregistré sur cet appareil. La vitrine publique arrive bientôt.",
    fallbackCategory: "Commerce",
    fallbackCity: "Quartier",
  },
  phone: {
    brand: "Marque / modèle",
    color: "Couleur / étui",
    lastSeen: "Dernier endroit vu",
    lastSeenPh: "Bus 24, café, école…",
    note: "Détail utile",
    submit: "Alerter la communauté",
    unknownColor: "Couleur inconnue",
    unknownPlace: "Lieu inconnu",
  },
  alerts: {
    person: "Prénom",
    relation: "Lien",
    child: "Enfant",
    partner: "Mari / conjoint",
    grandparents: "Grands-parents",
    other: "Autre proche",
    place: "Endroit où la personne doit être",
    radius: "Distance d’alerte",
    radiusPh: "200 m",
    submit: "Créer l’alerte",
    zone: "Zone : {place}",
  },
  attributes: {
    suggestions: ["Voisin", "Commerçant", "Bénévole", "Parent", "Grand-parent", "Livreur", "Étudiant", "Aidant"],
    other: "Autre attribut",
    add: "Ajouter",
    yours: "Vos attributs : {list}",
    none: "Aucun attribut pour l’instant.",
  },
  proximity: {
    activate: "Activer ma position",
    demo: "La liste ci-dessous est un quartier démo (Montréal).",
    unsupported: "La géolocalisation n’est pas disponible sur cet appareil.",
    received:
      "Position reçue ({lat}, {lon}). Les voisins réels seront branchés après la construction.",
    denied: "Position refusée. On reste sur le quartier démo — l’entraide n’attend pas.",
    kinds: {
      commerce: "Commerce",
      help: "Entraide",
      business: "Business",
      community: "Communauté",
    },
    people: {
      cafe: "Café des Pins",
      nadia: "Nadia · voisine",
      atelier: "Atelier Vélo-Nord",
      marc: "Marc · parent d’élève",
      epicerie: "Épicerie Hochelaga",
    },
  },
  catalogs: {
    reportage: [
      {
        title: "La ruelle qui s’entraide",
        meta: "Quartier",
        blurb:
          "Quand un voisin perd ses clés, trois portes s’ouvrent. Un reportage IA en cours de montage — prévu pour 2027.",
      },
      {
        title: "Commerces de proximité",
        meta: "Économie locale",
        blurb: "Ceux qui restent ouverts tard pour les familles. Un portrait d’Open Community.",
      },
      {
        title: "Garder un œil, sans surveiller",
        meta: "Société",
        blurb: "Alertes bienveillantes pour enfants et grands-parents : le débat de la semaine.",
      },
    ],
    series: [
      {
        title: "Rue des Pins",
        meta: "Feuilleton · 8 épisodes",
        blurb: "Un immeuble, six familles, une casserole de trop. Bientôt.",
      },
      {
        title: "Sepolia Café",
        meta: "Comédie",
        blurb: "Un portefeuille crypto, un espresso, trop de voisins curieux.",
      },
      {
        title: "La ronde de nuit",
        meta: "Drame",
        blurb: "Ceux qui marchent le quartier pour que personne ne rentre seul.",
      },
    ],
    dessins: [
      {
        title: "Flocon et les voisins",
        meta: "3-6 ans",
        blurb: "Un petit flocon apprend à demander de l’aide — et à en offrir.",
      },
      {
        title: "La trottinette perdue",
        meta: "5-8 ans",
        blurb: "Toute la rue cherche, tout le monde trouve, personne ne se moque.",
      },
      {
        title: "Grand-maman GPS",
        meta: "Famille",
        blurb: "Une grand-mère trop rapide, un village trop petit, beaucoup d’amour.",
      },
    ],
  },
  seeds: {
    "seed-courses-1": {
      title: "Courses du samedi — Plateau",
      description: "Je fais déjà mon épicerie le samedi matin. Je peux ajouter vos sacs, jusqu’à 4 sacs.",
    },
    "seed-courses-2": {
      title: "Livraison pharmacie + lait",
      description: "Je ne peux pas sortir aujourd’hui. Pharmacie Jean-Coutu + 2 litres de lait.",
    },
    "seed-demenagement-1": {
      title: "3e étage sans ascenseur — 2h",
      description: "Canapé + 8 cartons. Camionnette déjà louée, il me manque deux personnes.",
    },
    "seed-demenagement-2": {
      title: "Bras + camionnette 8 pi",
      description: "Disponible en soirée et week-end. Je peux aussi aider à monter les meubles.",
    },
    "seed-garde-1": {
      title: "Garde enfants 5-10 ans",
      description: "BAFA, références de deux familles du quartier. Soirs de semaine.",
    },
    "seed-garde-2": {
      title: "Promenade chien (labrador)",
      description: "Milo, 3 ans, très sociable. 30 à 45 minutes en fin d’après-midi.",
    },
    "seed-pret-1": {
      title: "Perceuse + kit de mèches",
      description: "Bosch 18V. Week-end seulement. Remise avec les piles chargées.",
    },
    "seed-pret-2": {
      title: "Emprunter une tente 4 places",
      description: "Week-end du 20 septembre, camping familial. Je peux laisser une caution.",
    },
  },
};

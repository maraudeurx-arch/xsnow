import type { Messages } from "./messages";

export const en: Messages = {
  brand: {
    community: "Open Community",
    slogan: "Monetize Yourself!",
  },
  nav: {
    accueil: "Home",
    accueilProposals: "Home proposals",
    mesServices: "My services",
    enDemande: "In demand",
    monProfil: "My profile",
    main: "Main navigation",
  },
  menu: {
    communaute: "Community",
    services: "Services",
    professionnelle: "Professional",
    coming2027: "Coming in 2027:",
    proximite: "See who’s nearby",
    telephone: "Find your lost phone",
    alertes:
      "Get an alert if your child, partner, or elderly parents leave the place they’re meant to be",
    business: "Promote your business with ads",
    monetise: "Monetize yourself: your image, your voice.",
    sondages: "Answer surveys and earn money",
    reportage: "With AI, create reports about your neighbourhood",
    scenarios: "Create comedy / animated scenarios",
  },
  guide: {
    pickAvatar: "Choose your avatar",
    changeAvatar: "Change avatar",
    replay: "Listen again",
    avatars: {
      "homme-blanc": "Man, light skin",
      "femme-blanche": "Woman, light skin",
      "homme-noir": "Man, dark skin",
      "femme-noire": "Woman, dark skin",
    },
    alts: {
      "homme-blanc": "Avatar of a light-skinned man with brown hair and a blue t-shirt",
      "femme-blanche": "Avatar of a light-skinned woman with chestnut hair and a beige sweater",
      "homme-noir": "Avatar of a dark-skinned man with glasses, a beard, and a camel jacket",
      "femme-noire": "Avatar of a dark-skinned woman with curly hair and a mustard sweater",
    },
  },
  chat: {
    title: "Talk to your avatar",
    placeholder: "Write to your avatar…",
    send: "Send",
    speak: "Speak",
    listening: "Listening…",
    networkError: "Can’t reach the avatar right now. Try again in a moment.",
    genericError: "The avatar couldn’t reply. Try again in a moment.",
    micUnsupported:
      "Dictation isn’t available on this device. Type your message — the keyboard is always there.",
    micPermission:
      "Microphone access denied. On iPhone: Settings → Safari → Microphone, or type your message.",
    micSilent: "I didn’t hear anything. Try “Speak” again, or type your message.",
    micNetwork: "Dictation unavailable right now. Type your message.",
    micError: "Can’t listen right now. Type your message.",
  },
  geo: {
    section: "Allow location",
    title: "Where are you right now?",
    body: "Allow your location to show your city name (and, later, neighbours nearby). Nothing is sent to a tracking server — only your city, on this device.",
    allow: "Allow my location",
    locating: "Finding your city…",
    skip: "Later — stay in Gatineau",
    errors: {
      unsupported: "Geolocation isn’t available on this device. You can continue with Gatineau.",
      generic: "Couldn’t get your location. Try again, or continue with Gatineau.",
      denied:
        "Safari denied location. In Settings → Safari → Location, or continue with Gatineau.",
      timeout: "Location took too long. Try again, or continue with Gatineau.",
      unavailable: "Location unavailable right now. Try again, or continue with Gatineau.",
    },
  },
  footer: {
    before: "Proximity and a spirit of mutual aid in service of ",
    after: ".",
  },
  welcome:
    "Hello, I’m your avatar in the Open Community ecosystem. The proximity and mutual-aid spirit of the people of {city} are our strength. Let your neighbours know about a service you can offer in exchange for compensation: helping someone move, running errands, or helping with work around the house. This app also gives you free services, like helping you find your phone if you lose it, and alerting you if your child, partner, or elderly parents leave the place they’re meant to be: school, work, or a retirement home. Go to Home and choose the service you’d like to receive, or that you’d like to offer your neighbours in {city}. Do you have suggestions for tasks and services you’d like to monetize? Let me know, and the whole community will benefit. People who share this app, and ideas that get monetized, will be rewarded in proportion to their efforts. Don’t hesitate to ask me anything at any time — I’m entirely at your disposal.",
  systemPrompt:
    "You are the visitor’s avatar in Open Community, in {city}. You speak only in English, you stay warm, concrete and brief. You help with neighbourhood mutual aid: errands and delivery, moving help, work around the house, child or pet sitting, lending or borrowing items, a lost phone, alerts if a child, partner, or elderly parents leave (school, work, retirement home). You invite them to tap Home, under {placeName} on the left, to choose a service to offer or receive. You do not pretend to be a human. In a real emergency, point them to 911. You are at the visitor’s disposal for any question about Open Community. Your appearance: {avatar}.",
  features: {
    business: {
      title: "Promote your business with ads",
      lead: "Publish a local ad in Open Community. Neighbours find you, you serve them.",
    },
    proximite: {
      title: "See who’s nearby",
      lead: "A human map of your neighbourhood: neighbours, shops, mutual aid.",
    },
    telephone: {
      title: "Find your lost phone",
      lead: "Report the device. Your city’s proximity becomes a safety net.",
    },
    alertes: {
      title: "Proximity alerts",
      lead: "Get an alert if a child, partner, or elderly parents leave the zone they’re meant to be in.",
    },
    reportage: {
      title: "With AI, create reports about your neighbourhood",
      lead: "An AI studio to tell the story of your street, your neighbours, your shop. Planned for 2027.",
    },
    series: {
      title: "TV series",
      lead: "Series born here, for here. Coming soon on the community channel.",
    },
    dessins: {
      title: "Cartoons",
      lead: "Kind cartoons, designed for families in the neighbourhood.",
    },
    attributs: {
      title: "Your attributes",
      lead: "Your mutual-aid tags. They stay on this device, with you.",
    },
    services: {
      title: "Open Community services",
      lead: "Neighbourhood safety services: lost phone and alerts if a loved one wanders.",
    },
    monetise: {
      title: "Monetize yourself: your image, your voice.",
      lead: "Offer your image or your voice to the community. Soon wired to your services.",
    },
    sondages: {
      title: "Answer surveys and earn money",
      lead: "Local surveys, clear compensation. Under construction.",
    },
    scenarios: {
      title: "Create comedy / animated scenarios",
      lead: "Invent community sketches and cartoons. Planned for 2027.",
    },
    mesServices: {
      title: "My services",
      lead: "Here you’ll see what you already offer the community: ads, services, items. Under construction.",
    },
    enDemande: {
      title: "In demand",
      lead: "Neighbourhood requests you could honour. Under construction.",
    },
    monProfil: {
      title: "My profile",
      lead: "Your local card: info, settings, invitations.",
    },
    mesInfos: {
      title: "My info",
      lead: "Your details and wallet stay on this device.",
    },
    reglages: {
      title: "Settings",
      lead: "App language. Notifications and display season will land here.",
    },
    inviter: {
      title: "Invite others to join the community",
      lead: "Share Open Community with a neighbour, a shop, a family.",
    },
    aPropos: {
      title: "About Open Community (OPC)",
      lead: "Proximity, mutual aid and local visibility — Monetize Yourself!",
    },
  },
  profile: {
    infos: "My info",
    reglages: "Settings",
    inviter: "Invite others to join the community",
    aPropos: "About Open Community (OPC)",
    infosBody: "Your details and wallet stay on this device.",
    reglagesHint: "The language you pick is saved on this device. It overrides the phone language.",
    inviterBody: "Share Open Community with a neighbour, a shop, a family.",
    aProposBody:
      "{placeName} / {community} — {slogan} Our proximity and spirit of mutual aid is the guarantee of our success.",
    language: "Language",
    comingSoon: "Notifications and display season will land here.",
  },
  stubs: {
    mesInfos:
      "Name, neighbourhood and attributes will show here. Meanwhile you can connect a wallet — it’s optional.",
    inviter:
      "An invite link and QR will appear here. For now, tell a neighbour about Open Community.",
    monetise:
      "Soon: offer your image or voice to monetize. Meanwhile, open Home → Professional.",
    scenarios:
      "A workshop to invent community sketches and cartoons. Planned for 2027.",
    sondages:
      "Neighbourhood surveys, clear compensation. Under construction.",
    mesServices:
      "The list of what you already offer — ads, services, items — will show here.",
    enDemande:
      "Neighbourhood requests — a hand, an errand, sitting — will appear here so you can answer them.",
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
    disconnect: "Disconnect wallet",
    connectAria: "Connect wallet",
    guest: "Guest · Sepolia",
    wrongNetwork: "Wrong network",
  },
  notFound: {
    title: "Page not found",
    back: "Back to Home",
  },
  logoAria: "Open Community",
  services: {
    courses: {
      title: "Errands and delivery",
      short: "Errands & delivery",
      lead: "Offer or request a run, a parcel, or a neighbourhood delivery. The rate is an agreement between neighbours.",
    },
    demenagement: {
      title: "Moving help",
      short: "Moving",
      lead: "Need extra hands, a truck, or want to help a neighbour move? Post it here.",
    },
    garde: {
      title: "Child and pet sitting",
      short: "Sitting",
      lead: "Childcare, walks, cats and dogs: paid neighbourhood help, in the open.",
    },
    pret: {
      title: "Lend / borrow items with a deposit",
      short: "Item loans",
      lead: "Lend or borrow an item. A deposit is agreed between the parties. No payment is taken for now: the deposit is a recorded agreement.",
    },
    listingType: "Listing type",
    offer: "Offer",
    request: "Request",
    offers: "Offers",
    requests: "Requests",
    all: "All",
    title: "Title",
    titlePh: "e.g. Saturday groceries",
    object: "Item lent or borrowed",
    objectPh: "Drill, tent, bike…",
    objectLine: "Item: {name}",
    description: "Description",
    neighborhood: "Neighbourhood",
    neighborhoodPh: "Plateau, Rosemont…",
    radius: "Radius",
    price: "Rate",
    currency: "Currency",
    unit: "Unit",
    collateralNote:
      "Deposit: amount agreed between the parties. No payment is taken for now — the agreement is only recorded.",
    collateralAmount: "Deposit amount",
    collateralCurrency: "Deposit currency",
    publish: "Publish in Open Community",
    saved: "Listing saved on this device. An API can pick it up later.",
    free: "Free",
    empty: "No listings for this filter.",
    collateralLine: "Deposit {amount} · {status} (agreement, not real escrow)",
    rate: {
      course: "per run",
      heure: "per hour",
      forfait: "flat rate",
      jour: "per day",
      pret: "for the loan",
    },
    collateralStatus: {
      proposee: "Deposit proposed",
      convenue: "Deposit agreed",
      en_attente: "Deposit pending",
      liberee: "Deposit released",
    },
  },
  business: {
    name: "Business name",
    category: "Category",
    categoryPh: "Café, repairs, services…",
    city: "City or neighbourhood",
    cityPh: "Plateau, Rosemont…",
    description: "Description",
    publish: "Publish in Open Community",
    saved: "Saved on this device. The public showcase is coming soon.",
    fallbackCategory: "Business",
    fallbackCity: "Neighbourhood",
  },
  phone: {
    brand: "Brand / model",
    color: "Colour / case",
    lastSeen: "Last place seen",
    lastSeenPh: "Bus 24, café, school…",
    note: "Useful detail",
    submit: "Alert the community",
    unknownColor: "Unknown colour",
    unknownPlace: "Unknown place",
  },
  alerts: {
    person: "First name",
    relation: "Relation",
    child: "Child",
    partner: "Spouse / partner",
    grandparents: "Grandparents",
    other: "Other loved one",
    place: "Place the person should be",
    radius: "Alert distance",
    radiusPh: "200 m",
    submit: "Create the alert",
    zone: "Zone: {place}",
  },
  attributes: {
    suggestions: [
      "Neighbour",
      "Shopkeeper",
      "Volunteer",
      "Parent",
      "Grandparent",
      "Courier",
      "Student",
      "Caregiver",
    ],
    other: "Another attribute",
    add: "Add",
    yours: "Your attributes: {list}",
    none: "No attributes yet.",
  },
  proximity: {
    activate: "Turn on my location",
    demo: "The list below is a demo neighbourhood (Montreal).",
    unsupported: "Geolocation isn’t available on this device.",
    received: "Location received ({lat}, {lon}). Real neighbours will be wired after construction.",
    denied: "Location denied. We stay on the demo neighbourhood — mutual aid doesn’t wait.",
    kinds: {
      commerce: "Shop",
      help: "Mutual aid",
      business: "Business",
      community: "Community",
    },
    people: {
      cafe: "Café des Pins",
      nadia: "Nadia · neighbour",
      atelier: "Atelier Vélo-Nord",
      marc: "Marc · school parent",
      epicerie: "Hochelaga grocery",
    },
  },
  catalogs: {
    reportage: [
      {
        title: "The alley that helps",
        meta: "Neighbourhood",
        blurb:
          "When a neighbour loses their keys, three doors open. An AI report in the works — planned for 2027.",
      },
      {
        title: "Shops around the corner",
        meta: "Local economy",
        blurb: "The ones that stay open late for families. An Open Community portrait.",
      },
      {
        title: "Keep an eye, without watching",
        meta: "Society",
        blurb: "Kind alerts for children and grandparents: this week’s debate.",
      },
    ],
    series: [
      {
        title: "Rue des Pins",
        meta: "Serial · 8 episodes",
        blurb: "One building, six families, one casserole too many. Coming soon.",
      },
      {
        title: "Sepolia Café",
        meta: "Comedy",
        blurb: "A crypto wallet, an espresso, too many curious neighbours.",
      },
      {
        title: "The night round",
        meta: "Drama",
        blurb: "Those who walk the neighbourhood so no one goes home alone.",
      },
    ],
    dessins: [
      {
        title: "Flake and the neighbours",
        meta: "Ages 3–6",
        blurb: "A little snowflake learns to ask for help — and to offer it.",
      },
      {
        title: "The lost scooter",
        meta: "Ages 5–8",
        blurb: "The whole street searches, everyone finds it, nobody teases.",
      },
      {
        title: "Grandma GPS",
        meta: "Family",
        blurb: "A grandma who’s too fast, a village that’s too small, a lot of love.",
      },
    ],
  },
  seeds: {
    "seed-courses-1": {
      title: "Saturday groceries — Plateau",
      description: "I already do my groceries Saturday morning. I can add your bags, up to 4 bags.",
    },
    "seed-courses-2": {
      title: "Pharmacy + milk delivery",
      description: "I can’t go out today. Jean-Coutu pharmacy + 2 litres of milk.",
    },
    "seed-demenagement-1": {
      title: "3rd floor, no elevator — 2h",
      description: "Sofa + 8 boxes. Van already rented, I still need two people.",
    },
    "seed-demenagement-2": {
      title: "Hands + 8-ft van",
      description: "Available evenings and weekends. I can also help carry furniture upstairs.",
    },
    "seed-garde-1": {
      title: "Childcare ages 5–10",
      description: "First-aid certified, references from two neighbourhood families. Weekday evenings.",
    },
    "seed-garde-2": {
      title: "Dog walk (labrador)",
      description: "Milo, 3 years old, very sociable. 30 to 45 minutes late afternoon.",
    },
    "seed-pret-1": {
      title: "Drill + bit kit",
      description: "Bosch 18V. Weekends only. Return with the batteries charged.",
    },
    "seed-pret-2": {
      title: "Borrow a 4-person tent",
      description: "Weekend of September 20, family camping. I can leave a deposit.",
    },
  },
};

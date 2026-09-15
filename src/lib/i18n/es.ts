import type { Messages } from "./messages";

export const es: Messages = {
  brand: {
    community: "Open Community",
    slogan: "¡Monetízate!",
  },
  nav: {
    accueil: "Inicio",
    accueilProposals: "Propuestas de Inicio",
    mesServices: "Mis servicios",
    enDemande: "En demanda",
    monProfil: "Mi perfil",
    main: "Navegación principal",
  },
  menu: {
    communaute: "Comunidad",
    services: "Servicios",
    professionnelle: "Profesional",
    coming2027: "En construcción para 2027:",
    proximite: "Mira quién está cerca",
    telephone: "Encuentra tu teléfono perdido",
    alertes:
      "Recibe una alerta si tu hijo, tu pareja o tus padres mayores se alejan del lugar donde deben estar",
    business: "Da a conocer tu negocio con anuncios",
    monetise: "Monetízate: tu imagen, tu voz.",
    sondages: "Responde encuestas y gana dinero",
    reportage: "Con IA, crea reportajes sobre tu barrio",
    scenarios: "Crea escenarios de humor / animación",
  },
  guide: {
    pickAvatar: "Elige tu avatar",
    changeAvatar: "Cambiar de avatar",
    replay: "Volver a escuchar",
    avatars: {
      "homme-blanc": "Hombre, piel clara",
      "femme-blanche": "Mujer, piel clara",
      "homme-noir": "Hombre, piel oscura",
      "femme-noire": "Mujer, piel oscura",
    },
    alts: {
      "homme-blanc": "Avatar de un hombre de piel clara, pelo castaño y camiseta azul",
      "femme-blanche": "Avatar de una mujer de piel clara, pelo castaño y jersey beige",
      "homme-noir": "Avatar de un hombre de piel oscura, gafas, barba y chaqueta camel",
      "femme-noire": "Avatar de una mujer de piel oscura, pelo rizado y jersey mostaza",
    },
  },
  chat: {
    title: "Habla con tu avatar",
    placeholder: "Escribe a tu avatar…",
    send: "Enviar",
    speak: "Hablar",
    listening: "Te escucho…",
    networkError: "No se puede contactar al avatar ahora. Inténtalo en un momento.",
    genericError: "El avatar no pudo responder. Inténtalo en un momento.",
    micUnsupported:
      "El dictado no está disponible en este aparato. Escribe tu mensaje — el teclado sigue ahí.",
    micPermission:
      "Acceso al micrófono denegado. En iPhone: Ajustes → Safari → Micrófono, o escribe tu mensaje.",
    micSilent: "No he oído nada. Vuelve a tocar «Hablar», o escribe tu mensaje.",
    micNetwork: "Dictado no disponible por ahora. Escribe tu mensaje.",
    micError: "No se puede escuchar ahora. Escribe tu mensaje.",
  },
  geo: {
    section: "Permitir la ubicación",
    title: "¿Dónde estás ahora?",
    body: "Permite tu ubicación para mostrar el nombre de tu ciudad (y, más adelante, a tus vecinos cercanos). Nada se envía a un servidor de seguimiento: solo tu ciudad, en este aparato.",
    allow: "Permitir mi ubicación",
    locating: "Buscando tu ciudad…",
    skip: "Más tarde — quedarme en Gatineau",
    errors: {
      unsupported:
        "La geolocalización no está disponible en este aparato. Puedes continuar con Gatineau.",
      generic: "No se pudo obtener tu ubicación. Reintenta, o continúa con Gatineau.",
      denied:
        "Safari denegó la ubicación. En Ajustes → Safari → Localización, o continúa con Gatineau.",
      timeout: "La ubicación tardó demasiado. Reintenta, o continúa con Gatineau.",
      unavailable: "Ubicación no disponible por ahora. Reintenta, o continúa con Gatineau.",
    },
  },
  footer: {
    before: "Proximidad y espíritu de ayuda mutua al servicio de ",
    after: ".",
  },
  welcome:
    "Hola, soy tu avatar en el ecosistema Open Community. La proximidad y el espíritu de ayuda mutua de la gente de {city} son nuestra fuerza. Haz saber a tus vecinos un servicio que puedes prestarles a cambio de una compensación: ayudar a mudarse, hacer recados o ayudar en trabajos de la casa. Además, esta aplicación te ofrece servicios gratuitos, como ayudarte a encontrar tu teléfono si lo pierdes, y avisarte si tu hijo, tu pareja o tus padres mayores se alejan del lugar donde deben estar: la escuela, el trabajo o la residencia. Ve a Inicio y elige el servicio que te gustaría recibir, o que quieras ofrecer a tus vecinos de {city}. ¿Tienes sugerencias de tareas y servicios que te gustaría monetizar? Dímelo, y toda la comunidad se beneficiará. Las personas que comparten esta aplicación, y las ideas que se monetizan, recibirán a prorrata de sus esfuerzos. No dudes en preguntarme en cualquier momento: estoy a tu entera disposición.",
  systemPrompt:
    "Eres el avatar del visitante en Open Community, en {city}. Hablas únicamente en español, tuteas, te mantienes cálido, concreto y breve. Ayudas en la solidaridad de barrio: recados y entrega, ayuda para mudanzas, trabajos en casa, cuidado de niños o mascotas, prestar o pedir objetos, teléfono perdido, alertas si un niño, una pareja o padres mayores se alejan (escuela, trabajo, residencia). Invitas a tocar Inicio, bajo {placeName} a la izquierda, para elegir un servicio a ofrecer o recibir. No pretendes ser un humano. En una emergencia real, orienta al 911. Estás a disposición del visitante para cualquier pregunta sobre Open Community. Tu apariencia: {avatar}.",
  features: {
    business: {
      title: "Da a conocer tu negocio con anuncios",
      lead: "Publica un anuncio local en Open Community. Los vecinos te encuentran, tú les sirves.",
    },
    proximite: {
      title: "Mira quién está cerca",
      lead: "Un mapa humano de tu barrio: vecinos, comercios, ayuda mutua.",
    },
    telephone: {
      title: "Encuentra tu teléfono perdido",
      lead: "Avisa del aparato. La proximidad de tu ciudad se vuelve una red de seguridad.",
    },
    alertes: {
      title: "Alertas de proximidad",
      lead: "Recibe una alerta si un niño, una pareja o padres mayores se alejan de la zona donde deben estar.",
    },
    reportage: {
      title: "Con IA, crea reportajes sobre tu barrio",
      lead: "Un estudio de IA para contar tu calle, tus vecinos, tu comercio. Previsto para 2027.",
    },
    series: {
      title: "Series de TV",
      lead: "Series nacidas aquí, para aquí. Pronto en la antena comunitaria.",
    },
    dessins: {
      title: "Dibujos animados",
      lead: "Dibujos animados amables, pensados para las familias del barrio.",
    },
    attributs: {
      title: "Tus atributos",
      lead: "Tus etiquetas de ayuda mutua. Quedan en este aparato, contigo.",
    },
    services: {
      title: "Servicios Open Community",
      lead: "Servicios de seguridad del barrio: teléfono perdido y alertas si un ser querido se aleja.",
    },
    monetise: {
      title: "Monetízate: tu imagen, tu voz.",
      lead: "Ofrece tu imagen o tu voz a la comunidad. Pronto conectado a tus servicios.",
    },
    sondages: {
      title: "Responde encuestas y gana dinero",
      lead: "Encuestas locales, compensación clara. En construcción.",
    },
    scenarios: {
      title: "Crea escenarios de humor / animación",
      lead: "Inventa sketches y dibujos animados comunitarios. Previsto para 2027.",
    },
    mesServices: {
      title: "Mis servicios",
      lead: "Aquí verás lo que ya ofreces a la comunidad: anuncios, servicios, objetos. En construcción.",
    },
    enDemande: {
      title: "En demanda",
      lead: "Las peticiones del barrio que podrías honrar. En construcción.",
    },
    monProfil: {
      title: "Mi perfil",
      lead: "Tu ficha local: datos, ajustes, invitaciones.",
    },
    mesInfos: {
      title: "Mis datos",
      lead: "Tus datos y tu cartera se quedan en este aparato.",
    },
    reglages: {
      title: "Ajustes",
      lead: "Idioma de la aplicación. Las notificaciones y la estación de pantalla llegarán aquí.",
    },
    inviter: {
      title: "Invitar a otros a unirse a la comunidad",
      lead: "Comparte Open Community con un vecino, un comercio, una familia.",
    },
    aPropos: {
      title: "Acerca de Open Community (OPC)",
      lead: "Proximidad, ayuda mutua y visibilidad local — ¡Monetízate!",
    },
  },
  profile: {
    infos: "Mis datos",
    reglages: "Ajustes",
    inviter: "Invitar a otros a unirse a la comunidad",
    aPropos: "Acerca de Open Community (OPC)",
    infosBody: "Tus datos y tu cartera se quedan en este aparato.",
    reglagesHint: "El idioma elegido se guarda en este aparato. Sustituye el idioma del teléfono.",
    inviterBody: "Comparte Open Community con un vecino, un comercio, una familia.",
    aProposBody:
      "{placeName} / {community} — {slogan} Nuestra proximidad y nuestro espíritu de ayuda mutua son la garantía de nuestro éxito.",
    language: "Idioma",
    comingSoon: "Las notificaciones y la estación de pantalla llegarán aquí.",
  },
  stubs: {
    mesInfos:
      "Nombre, barrio y atributos se mostrarán aquí. Mientras tanto puedes conectar una cartera — no es obligatorio.",
    inviter:
      "Un enlace de invitación y un QR aparecerán aquí. Por ahora, habla de Open Community a un vecino.",
    monetise:
      "Pronto: ofrece tu imagen o tu voz para monetizar. Mientras tanto, abre Inicio → Profesional.",
    scenarios:
      "Un taller para inventar sketches y dibujos animados comunitarios. Previsto para 2027.",
    sondages:
      "Encuestas de barrio, compensación clara. En construcción.",
    mesServices:
      "La lista de lo que ya ofreces — anuncios, servicios, objetos — se mostrará aquí.",
    enDemande:
      "Las peticiones del barrio — una mano, un recado, un cuidado — aparecerán aquí para que puedas responder.",
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
    disconnect: "Desconectar la cartera",
    connectAria: "Conectar la cartera",
    guest: "Invitado · Sepolia",
    wrongNetwork: "Red incorrecta",
  },
  notFound: {
    title: "Página no encontrada",
    back: "Volver a Inicio",
  },
  logoAria: "Open Community",
  services: {
    courses: {
      title: "Recados y entrega",
      short: "Recados y entrega",
      lead: "Ofrece o pide un recado, un paquete o una entrega de barrio. La tarifa es un acuerdo entre vecinos.",
    },
    demenagement: {
      title: "Ayuda para mudanzas",
      short: "Mudanza",
      lead: "¿Necesitas brazos, una camioneta, o quieres ayudar a un vecino a mudarse? Publícalo aquí.",
    },
    garde: {
      title: "Cuidado de niños y mascotas",
      short: "Cuidado",
      lead: "Cuidado de niños, paseos, gatos y perros: la ayuda de barrio de pago, con claridad.",
    },
    pret: {
      title: "Préstamo / préstamo de objetos con fianza",
      short: "Préstamo de objetos",
      lead: "Presta o pide un objeto. Una fianza (depósito) se acuerda entre las partes. Por ahora no se cobra: la fianza es un acuerdo registrado.",
    },
    listingType: "Tipo de anuncio",
    offer: "Oferta",
    request: "Petición",
    offers: "Ofertas",
    requests: "Peticiones",
    all: "Todas",
    title: "Título",
    titlePh: "Ej. Compras del sábado",
    object: "Objeto prestado o pedido",
    objectPh: "Taladro, tienda, bici…",
    objectLine: "Objeto: {name}",
    description: "Descripción",
    neighborhood: "Barrio",
    neighborhoodPh: "Plateau, Rosemont…",
    radius: "Radio",
    price: "Tarifa",
    currency: "Moneda",
    unit: "Unidad",
    collateralNote:
      "Fianza (depósito): monto acordado entre las partes. Por ahora no se cobra — el acuerdo solo se registra.",
    collateralAmount: "Monto de la fianza",
    collateralCurrency: "Moneda de la fianza",
    publish: "Publicar en Open Community",
    saved: "Anuncio guardado en este aparato. Una API podrá retomarlo más tarde.",
    free: "Gratis",
    empty: "Ningún anuncio para este filtro.",
    collateralLine: "Fianza {amount} · {status} (acuerdo, no un escrow real)",
    rate: {
      course: "por recado",
      heure: "por hora",
      forfait: "tarifa fija",
      jour: "por día",
      pret: "por el préstamo",
    },
    collateralStatus: {
      proposee: "Fianza propuesta",
      convenue: "Fianza acordada",
      en_attente: "Fianza pendiente",
      liberee: "Fianza liberada",
    },
  },
  business: {
    name: "Nombre del negocio",
    category: "Categoría",
    categoryPh: "Café, reparación, servicios…",
    city: "Ciudad o barrio",
    cityPh: "Plateau, Rosemont…",
    description: "Descripción",
    publish: "Publicar en Open Community",
    saved: "Guardado en este aparato. El escaparate público llega pronto.",
    fallbackCategory: "Comercio",
    fallbackCity: "Barrio",
  },
  phone: {
    brand: "Marca / modelo",
    color: "Color / funda",
    lastSeen: "Último lugar visto",
    lastSeenPh: "Bus 24, café, escuela…",
    note: "Detalle útil",
    submit: "Alertar a la comunidad",
    unknownColor: "Color desconocido",
    unknownPlace: "Lugar desconocido",
  },
  alerts: {
    person: "Nombre",
    relation: "Vínculo",
    child: "Hijo",
    partner: "Cónyuge / pareja",
    grandparents: "Abuelos",
    other: "Otro ser querido",
    place: "Lugar donde la persona debe estar",
    radius: "Distancia de alerta",
    radiusPh: "200 m",
    submit: "Crear la alerta",
    zone: "Zona: {place}",
  },
  attributes: {
    suggestions: [
      "Vecino",
      "Comerciante",
      "Voluntario",
      "Padre / madre",
      "Abuelo / abuela",
      "Repartidor",
      "Estudiante",
      "Cuidador",
    ],
    other: "Otro atributo",
    add: "Añadir",
    yours: "Tus atributos: {list}",
    none: "Ningún atributo por ahora.",
  },
  proximity: {
    activate: "Activar mi ubicación",
    demo: "La lista de abajo es un barrio de demostración (Montreal).",
    unsupported: "La geolocalización no está disponible en este aparato.",
    received:
      "Ubicación recibida ({lat}, {lon}). Los vecinos reales se conectarán después de la construcción.",
    denied: "Ubicación denegada. Seguimos en el barrio de demostración: la ayuda no espera.",
    kinds: {
      commerce: "Comercio",
      help: "Ayuda mutua",
      business: "Negocio",
      community: "Comunidad",
    },
    people: {
      cafe: "Café des Pins",
      nadia: "Nadia · vecina",
      atelier: "Atelier Vélo-Nord",
      marc: "Marc · padre de alumno",
      epicerie: "Épicerie Hochelaga",
    },
  },
  catalogs: {
    reportage: [
      {
        title: "El callejón que se ayuda",
        meta: "Barrio",
        blurb:
          "Cuando un vecino pierde las llaves, tres puertas se abren. Un reportaje de IA en montaje — previsto para 2027.",
      },
      {
        title: "Comercios de proximidad",
        meta: "Economía local",
        blurb: "Los que siguen abiertos tarde para las familias. Un retrato de Open Community.",
      },
      {
        title: "Vigilar sin vigilar",
        meta: "Sociedad",
        blurb: "Alertas amables para niños y abuelos: el debate de la semana.",
      },
    ],
    series: [
      {
        title: "Rue des Pins",
        meta: "Serial · 8 episodios",
        blurb: "Un edificio, seis familias, una cazuela de más. Pronto.",
      },
      {
        title: "Sepolia Café",
        meta: "Comedia",
        blurb: "Una cartera cripto, un espresso, demasiados vecinos curiosos.",
      },
      {
        title: "La ronda de noche",
        meta: "Drama",
        blurb: "Los que caminan el barrio para que nadie vuelva solo.",
      },
    ],
    dessins: [
      {
        title: "Copo y los vecinos",
        meta: "3-6 años",
        blurb: "Un copo pequeño aprende a pedir ayuda — y a ofrecerla.",
      },
      {
        title: "El patinete perdido",
        meta: "5-8 años",
        blurb: "Toda la calle busca, todos encuentran, nadie se burla.",
      },
      {
        title: "Abuela GPS",
        meta: "Familia",
        blurb: "Una abuela demasiado rápida, un pueblo demasiado pequeño, mucho amor.",
      },
    ],
  },
  seeds: {
    "seed-courses-1": {
      title: "Compras del sábado — Plateau",
      description: "Ya hago la compra el sábado por la mañana. Puedo añadir tus bolsas, hasta 4 bolsas.",
    },
    "seed-courses-2": {
      title: "Entrega farmacia + leche",
      description: "Hoy no puedo salir. Farmacia Jean-Coutu + 2 litros de leche.",
    },
    "seed-demenagement-1": {
      title: "3.er piso sin ascensor — 2h",
      description: "Sofá + 8 cajas. Furgoneta ya alquilada, me faltan dos personas.",
    },
    "seed-demenagement-2": {
      title: "Brazos + furgoneta de 8 pies",
      description: "Disponible por las tardes y el fin de semana. También puedo ayudar a subir muebles.",
    },
    "seed-garde-1": {
      title: "Cuidado de niños 5-10 años",
      description: "Primeros auxilios, referencias de dos familias del barrio. Tardes entre semana.",
    },
    "seed-garde-2": {
      title: "Paseo de perro (labrador)",
      description: "Milo, 3 años, muy sociable. 30 a 45 minutos a última hora de la tarde.",
    },
    "seed-pret-1": {
      title: "Taladro + juego de brocas",
      description: "Bosch 18V. Solo fin de semana. Devolver con las baterías cargadas.",
    },
    "seed-pret-2": {
      title: "Pedir prestada una tienda de 4 plazas",
      description: "Fin de semana del 20 de septiembre, camping familiar. Puedo dejar una fianza.",
    },
  },
};

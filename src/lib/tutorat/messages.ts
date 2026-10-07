/**
 * Placeholder copy for the hidden `/tutorat` preview.
 * No brand, provider, price, country or person is mentioned on purpose.
 * To be reviewed before B1.
 */

export type TutoratCopy = {
  title: string;
  lead: string;
  badge: string;
  adultsOnly: string;
  sections: { heading: string; body: string }[];
};

export const TUTORAT_COPY: Record<"fr" | "en" | "es", TutoratCopy> = {
  fr: {
    title: "Tutorat en ligne",
    lead:
      "Séances en direct avec un tuteur, pensées pour les téléphones et les connexions faibles (audio d’abord). Texte provisoire.",
    badge: "Aperçu interne — section en construction, non ouverte au public",
    adultsOnly: "Réservé aux personnes de 18 ans et plus.",
    sections: [
      {
        heading: "Comment cela fonctionnera",
        body:
          "Réserver un créneau, rejoindre la séance depuis le téléphone, audio d’abord. Texte provisoire.",
      },
      {
        heading: "Pour les tuteurs",
        body: "Candidature puis validation avant de pouvoir enseigner. Texte provisoire.",
      },
      {
        heading: "État actuel",
        body: "Rien ne peut encore être réservé ni payé. Texte provisoire.",
      },
    ],
  },
  en: {
    title: "Online tutoring",
    lead:
      "Live sessions with a tutor, designed for phones and weak connections (audio first). Provisional text.",
    badge: "Internal preview — section under construction, not open to the public",
    adultsOnly: "For people aged 18 and over only.",
    sections: [
      {
        heading: "How it will work",
        body: "Book a slot, join the session from the phone, audio first. Provisional text.",
      },
      {
        heading: "For tutors",
        body: "Application and approval before teaching. Provisional text.",
      },
      {
        heading: "Current status",
        body: "Nothing can be booked or paid yet. Provisional text.",
      },
    ],
  },
  es: {
    title: "Tutoría en línea",
    lead:
      "Sesiones en directo con un tutor, pensadas para teléfonos y conexiones débiles (audio primero). Texto provisional.",
    badge: "Vista previa interna — sección en construcción, no abierta al público",
    adultsOnly: "Solo para personas de 18 años o más.",
    sections: [
      {
        heading: "Cómo funcionará",
        body: "Reservar un horario, entrar a la sesión desde el teléfono, audio primero. Texto provisional.",
      },
      {
        heading: "Para tutores",
        body: "Solicitud y aprobación antes de enseñar. Texto provisional.",
      },
      {
        heading: "Estado actual",
        body: "Todavía no se puede reservar ni pagar nada. Texto provisional.",
      },
    ],
  },
};

/** Returns the copy for the given locale, falling back to French. */
export function getTutoratCopy(locale: string): TutoratCopy {
  if (locale === "fr" || locale === "en" || locale === "es") {
    return TUTORAT_COPY[locale];
  }
  return TUTORAT_COPY.fr;
}

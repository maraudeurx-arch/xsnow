/** French gentilés for place branding. Prefer a dictionary; else a short heuristic. */

export type DemonymForms = {
  /** Collective / masculine form used in « au service des {demonym} ». */
  generic: string;
  feminine: string;
};

type Entry = {
  display: string;
  generic: string;
  feminine: string;
  countryCode: string;
  localeHint: string;
  lat?: number;
  lon?: number;
};

const KNOWN: Record<string, Entry> = {
  gatineau: {
    display: "Gatineau",
    generic: "Gatinois",
    feminine: "Gatinoise",
    countryCode: "CA",
    localeHint: "fr-CA",
    lat: 45.4765,
    lon: -75.7013,
  },
  montreal: {
    display: "Montréal",
    generic: "Montréalais",
    feminine: "Montréalaise",
    countryCode: "CA",
    localeHint: "fr-CA",
    lat: 45.5017,
    lon: -73.5673,
  },
  montréal: {
    display: "Montréal",
    generic: "Montréalais",
    feminine: "Montréalaise",
    countryCode: "CA",
    localeHint: "fr-CA",
    lat: 45.5017,
    lon: -73.5673,
  },
  ottawa: {
    display: "Ottawa",
    generic: "Ottaviens",
    feminine: "Ottaviennes",
    countryCode: "CA",
    localeHint: "fr-CA",
    lat: 45.4215,
    lon: -75.6972,
  },
  quebec: {
    display: "Québec",
    generic: "Québécois",
    feminine: "Québécoise",
    countryCode: "CA",
    localeHint: "fr-CA",
    lat: 46.8139,
    lon: -71.208,
  },
  québec: {
    display: "Québec",
    generic: "Québécois",
    feminine: "Québécoise",
    countryCode: "CA",
    localeHint: "fr-CA",
    lat: 46.8139,
    lon: -71.208,
  },
  toronto: {
    display: "Toronto",
    generic: "Torontois",
    feminine: "Torontoise",
    countryCode: "CA",
    localeHint: "fr-CA",
    lat: 43.6532,
    lon: -79.3832,
  },
  vancouver: {
    display: "Vancouver",
    generic: "Vancouverois",
    feminine: "Vancouveroise",
    countryCode: "CA",
    localeHint: "en-CA",
    lat: 49.2827,
    lon: -123.1207,
  },
  "new york": {
    display: "New York",
    generic: "New-Yorkais",
    feminine: "New-Yorkaise",
    countryCode: "US",
    localeHint: "en-US",
    lat: 40.7128,
    lon: -74.006,
  },
  "los angeles": {
    display: "Los Angeles",
    generic: "Los-Angelins",
    feminine: "Los-Angelines",
    countryCode: "US",
    localeHint: "en-US",
    lat: 34.0522,
    lon: -118.2437,
  },
  "san francisco": {
    display: "San Francisco",
    generic: "San-Franciscains",
    feminine: "San-Franciscaines",
    countryCode: "US",
    localeHint: "en-US",
    lat: 37.7749,
    lon: -122.4194,
  },
  boston: {
    display: "Boston",
    generic: "Bostoniens",
    feminine: "Bostoniennes",
    countryCode: "US",
    localeHint: "en-US",
  },
  chicago: {
    display: "Chicago",
    generic: "Chicagoans",
    feminine: "Chicagoanes",
    countryCode: "US",
    localeHint: "en-US",
  },
  miami: {
    display: "Miami",
    generic: "Miamiens",
    feminine: "Miamiennes",
    countryCode: "US",
    localeHint: "en-US",
  },
  paris: {
    display: "Paris",
    generic: "Parisiens",
    feminine: "Parisiennes",
    countryCode: "FR",
    localeHint: "fr-FR",
    lat: 48.8566,
    lon: 2.3522,
  },
  lyon: {
    display: "Lyon",
    generic: "Lyonnais",
    feminine: "Lyonnaise",
    countryCode: "FR",
    localeHint: "fr-FR",
  },
  marseille: {
    display: "Marseille",
    generic: "Marseillais",
    feminine: "Marseillaise",
    countryCode: "FR",
    localeHint: "fr-FR",
  },
  bordeaux: {
    display: "Bordeaux",
    generic: "Bordelais",
    feminine: "Bordelaise",
    countryCode: "FR",
    localeHint: "fr-FR",
  },
  toulouse: {
    display: "Toulouse",
    generic: "Toulousains",
    feminine: "Toulousaines",
    countryCode: "FR",
    localeHint: "fr-FR",
  },
  lille: {
    display: "Lille",
    generic: "Lillois",
    feminine: "Lilloise",
    countryCode: "FR",
    localeHint: "fr-FR",
  },
  nantes: {
    display: "Nantes",
    generic: "Nantais",
    feminine: "Nantaise",
    countryCode: "FR",
    localeHint: "fr-FR",
  },
  nice: {
    display: "Nice",
    generic: "Niçois",
    feminine: "Niçoise",
    countryCode: "FR",
    localeHint: "fr-FR",
  },
  strasbourg: {
    display: "Strasbourg",
    generic: "Strasbourgeois",
    feminine: "Strasbourgeoise",
    countryCode: "FR",
    localeHint: "fr-FR",
  },
  bruxelles: {
    display: "Bruxelles",
    generic: "Bruxellois",
    feminine: "Bruxelloise",
    countryCode: "BE",
    localeHint: "fr-BE",
  },
  brussels: {
    display: "Bruxelles",
    generic: "Bruxellois",
    feminine: "Bruxelloise",
    countryCode: "BE",
    localeHint: "fr-BE",
  },
  geneve: {
    display: "Genève",
    generic: "Genevois",
    feminine: "Genevoise",
    countryCode: "CH",
    localeHint: "fr-CH",
  },
  genève: {
    display: "Genève",
    generic: "Genevois",
    feminine: "Genevoise",
    countryCode: "CH",
    localeHint: "fr-CH",
  },
  geneva: {
    display: "Genève",
    generic: "Genevois",
    feminine: "Genevoise",
    countryCode: "CH",
    localeHint: "fr-CH",
  },
  londres: {
    display: "Londres",
    generic: "Londoniens",
    feminine: "Londoniennes",
    countryCode: "GB",
    localeHint: "en-GB",
  },
  london: {
    display: "Londres",
    generic: "Londoniens",
    feminine: "Londoniennes",
    countryCode: "GB",
    localeHint: "en-GB",
  },
};

export function normalizeCityKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function lookupKnownCity(value: string): Entry | null {
  const key = normalizeCityKey(value);
  return KNOWN[key] ?? null;
}

export function displayCity(value: string) {
  const known = lookupKnownCity(value);
  if (known) return known.display;
  return value
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function placeName(value: string) {
  return displayCity(value).toLocaleUpperCase("fr-FR");
}

function fallbackForms(city: string): DemonymForms {
  const pretty = displayCity(city);
  const key = normalizeCityKey(city);

  if (key.startsWith("new ")) {
    const rest = pretty.replace(/^New\s+/i, "").replace(/\s+/g, "-");
    return {
      generic: `New-${rest}ais`,
      feminine: `New-${rest}aise`,
    };
  }

  if (/eau$/i.test(pretty) && !/bordeaux/i.test(pretty)) {
    const stem = pretty.slice(0, -3);
    return { generic: `${stem}ois`, feminine: `${stem}oise` };
  }

  if (/(éal|eal)$/i.test(pretty)) {
    const stem = pretty.replace(/eal$/i, "éal");
    return { generic: `${stem}ais`, feminine: `${stem}aise` };
  }

  if (/ville$/i.test(pretty)) {
    return { generic: `${pretty}ois`, feminine: `${pretty}oise` };
  }

  return {
    generic: `habitants de ${pretty}`,
    feminine: `habitantes de ${pretty}`,
  };
}

export function demonymFormsFor(city: string): DemonymForms {
  const known = lookupKnownCity(city);
  if (known) {
    return { generic: known.generic, feminine: known.feminine };
  }
  return fallbackForms(city);
}

const EN_DEMONYM: Record<string, string> = {
  gatineau: "Gatineau residents",
  montreal: "Montrealers",
  ottawa: "Ottawans",
  quebec: "Quebecers",
  toronto: "Torontonians",
  vancouver: "Vancouverites",
  "new york": "New Yorkers",
  "los angeles": "Angelenos",
  "san francisco": "San Franciscans",
  boston: "Bostonians",
  chicago: "Chicagoans",
  miami: "Miamians",
  paris: "Parisians",
  lyon: "Lyonnais",
  marseille: "Marseillais",
  bordeaux: "Bordelais",
  toulouse: "Toulousains",
  lille: "Lillois",
  nantes: "Nantais",
  nice: "Niçois",
  strasbourg: "Strasbourgeois",
  bruxelles: "Brussels residents",
  brussels: "Brussels residents",
  geneve: "Genevans",
  geneva: "Genevans",
  londres: "Londoners",
  london: "Londoners",
};

const ES_DEMONYM: Record<string, string> = {
  gatineau: "los gatineses",
  montreal: "los montrealenses",
  ottawa: "los ottawienses",
  quebec: "los quebequenses",
  toronto: "los torontoenses",
  vancouver: "los vancuberenses",
  "new york": "los neoyorquinos",
  "los angeles": "los angelinos",
  "san francisco": "los sanfranciscanos",
  boston: "los bostonianos",
  chicago: "los chicagüenses",
  miami: "los miamenses",
  paris: "los parisinos",
  lyon: "los lioneses",
  marseille: "los marselleses",
  bordeaux: "los burdeos",
  toulouse: "los tolosanos",
  lille: "los lillenses",
  nantes: "los nanteses",
  nice: "los niceses",
  strasbourg: "los estrasburgueses",
  bruxelles: "los bruselenses",
  brussels: "los bruselenses",
  geneve: "los ginebrinos",
  geneva: "los ginebrinos",
  londres: "los londinenses",
  london: "los londinenses",
};

/** Footer / speech: locale-aware gentilé, or « habitants de {city} » / equivalent. */
export function demonymFor(city: string, locale: "fr" | "en" | "es" = "fr") {
  const pretty = displayCity(city);
  const key = normalizeCityKey(city);
  if (locale === "en") {
    return EN_DEMONYM[key] ?? `residents of ${pretty}`;
  }
  if (locale === "es") {
    return ES_DEMONYM[key] ?? `los habitantes de ${pretty}`;
  }
  return demonymFormsFor(city).generic;
}

/** Inclusive pair when both genders exist: « New-Yorkais / New-Yorkaise ». */
export function demonymPairFor(city: string) {
  const forms = demonymFormsFor(city);
  if (forms.generic.startsWith("habitants")) return forms.generic;
  if (forms.feminine && forms.feminine !== forms.generic) {
    return `${forms.generic} / ${forms.feminine}`;
  }
  return forms.generic;
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLatLon } from "../../workers/xsnow-chat/src/geo.ts";
import { lookupKnownCity } from "./demonym.ts";
import { fr } from "./i18n/fr.ts";
import { interpolate } from "./i18n/locales.ts";
import {
  acceptGeoResult,
  frenchVoiceLangFor,
  geoResultFromPayload,
  inferLocaleHint,
  isImplausibleSeedCity,
  parseCityOverride,
  parseGeoPromptOverride,
} from "./geo-logic.ts";
import {
  brandingForPlace,
  fallbackPlace,
  placeFromCityName,
  placeToKeepOnSkip,
  sanitizeStoredPlace,
} from "./place-logic.ts";
import { shouldRespeakWelcome, welcomeSpeechReady } from "./welcome-place.ts";
import { pickFrenchVoice, pickSpokenVoice } from "./voices.ts";

describe("parseCityOverride", () => {
  it("reads ?city= for QA", () => {
    assert.equal(parseCityOverride("?city=New%20York"), "New York");
    assert.equal(parseCityOverride("city=Gatineau"), "Gatineau");
    assert.equal(parseCityOverride("?season=winter"), null);
  });

  it("detects ?geo=prompt", () => {
    assert.equal(parseGeoPromptOverride("?geo=prompt"), true);
    assert.equal(parseGeoPromptOverride("?city=Paris"), false);
  });
});

describe("known city hints", () => {
  it("maps New York to US / en-US", () => {
    const known = lookupKnownCity("New York");
    assert.equal(known?.display, "New York");
    assert.equal(known?.countryCode, "US");
    assert.equal(known?.localeHint, "en-US");
    assert.ok(known?.lat && known.lat > 40);
  });

  it("maps Gatineau to fr-CA", () => {
    const known = lookupKnownCity("Gatineau");
    assert.equal(known?.countryCode, "CA");
    assert.equal(known?.localeHint, "fr-CA");
  });
});

describe("inferLocaleHint", () => {
  it("prefers Canadian French in Québec / Ontario", () => {
    assert.equal(inferLocaleHint("CA", "Quebec"), "fr-CA");
    assert.equal(inferLocaleHint("CA", "Ontario"), "fr-CA");
    assert.equal(inferLocaleHint("FR"), "fr-FR");
    assert.equal(inferLocaleHint("US", "New York"), "en-US");
    assert.equal(inferLocaleHint("HT"), "fr-HT");
  });
});

describe("frenchVoiceLangFor", () => {
  it("keeps French even for US locale hints", () => {
    assert.equal(frenchVoiceLangFor("en-US"), "fr-CA");
    assert.equal(frenchVoiceLangFor("fr-FR"), "fr-FR");
    assert.equal(frenchVoiceLangFor("fr-CA"), "fr-CA");
    assert.equal(frenchVoiceLangFor("fr-HT"), "fr-FR");
  });
});

describe("geoResultFromPayload", () => {
  it("accepts worker-shaped payloads", () => {
    const parsed = geoResultFromPayload({
      city: "New York",
      countryCode: "us",
      localeHint: "en-US",
    });
    assert.deepEqual(parsed, {
      city: "New York",
      countryCode: "US",
      localeHint: "en-US",
    });
  });

  it("rejects incomplete payloads", () => {
    assert.equal(geoResultFromPayload({ city: "Paris" }), null);
  });
});

describe("copy mentions the detected city", () => {
  it("welcome and system prompt include New York", () => {
    assert.match(interpolate(fr.welcome, { city: "New York" }), /voisins de New York/);
    assert.match(
      interpolate(fr.systemPrompt, { city: "New York", placeName: "NEW YORK", avatar: "" }),
      /à New York/,
    );
    assert.match(
      interpolate(fr.systemPrompt, { city: "New York", placeName: "NEW YORK", avatar: "" }),
      /sous NEW YORK/,
    );
  });
});

describe("worker parseLatLon", () => {
  it("accepts numbers and strings, rejects junk", () => {
    assert.deepEqual(parseLatLon({ lat: 40.7, lon: -74.0 }), { lat: 40.7, lon: -74.0 });
    assert.deepEqual(parseLatLon({ lat: "45.48", lon: "-75.70" }), {
      lat: 45.48,
      lon: -75.7,
    });
    assert.equal(parseLatLon({ lat: 200, lon: 0 }), null);
  });
});

describe("pickFrenchVoice", () => {
  function voice(name: string, lang: string, gender: "male" | "female") {
    return {
      name,
      lang,
      voiceURI: name,
      localService: true,
      default: false,
      gender,
    } as SpeechSynthesisVoice & { gender: string };
  }

  const voices = [
    voice("Samantha", "en-US", "female"),
    voice("Thomas", "fr-FR", "male"),
    voice("Amélie", "fr-CA", "female"),
    voice("Nicolas", "fr-CA", "male"),
  ];

  it("prefers regional French then gender, never English", () => {
    const femaleCa = pickFrenchVoice(voices, "female", "fr-CA");
    assert.equal(femaleCa?.name, "Amélie");

    const maleUs = pickFrenchVoice(voices, "male", "en-US");
    assert.equal(maleUs?.name, "Nicolas");
    assert.ok(maleUs?.lang.toLowerCase().startsWith("fr"));
  });

  it("picks English or Spanish when that is the UI language", () => {
    assert.equal(pickSpokenVoice(voices, "female", "en", "en-US")?.name, "Samantha");
    const extra = [
      ...voices,
      voice("Monica", "es-ES", "female"),
      voice("Jorge", "es-MX", "male"),
    ];
    assert.equal(pickSpokenVoice(extra, "male", "es", "es-MX")?.name, "Jorge");
  });
});

const HAITI = { lat: 18.5392, lon: -72.335 };

describe("live place vs Gatineau seed", () => {
  it("rejects a Gatineau geocode stamp on Haiti coordinates", () => {
    assert.equal(isImplausibleSeedCity("Gatineau", HAITI.lat, HAITI.lon), true);
    assert.equal(
      acceptGeoResult(HAITI.lat, HAITI.lon, {
        city: "Gatineau",
        countryCode: "CA",
        localeHint: "fr-CA",
      }),
      false,
    );
    assert.equal(
      acceptGeoResult(HAITI.lat, HAITI.lon, {
        city: "Port-au-Prince",
        countryCode: "HT",
        localeHint: "fr-HT",
      }),
      true,
    );
    assert.equal(acceptGeoResult(45.4765, -75.7013, { city: "Gatineau" }), true);
  });

  it("strips a poisoned stored Gatineau label when GPS is in Haiti", () => {
    const cleaned = sanitizeStoredPlace(
      {
        lat: HAITI.lat,
        lon: HAITI.lon,
        city: "Gatineau",
        countryCode: "CA",
        localeHint: "fr-CA",
        updatedAt: 1,
      },
      "granted",
    );
    assert.equal(cleaned.city, "");
    assert.equal(cleaned.lat, HAITI.lat);
  });

  it("does not present the seed city after skip when that is all we have", () => {
    const skipped = placeToKeepOnSkip(fallbackPlace(1));
    assert.equal(skipped.city, "");
    const kept = placeToKeepOnSkip({
      lat: HAITI.lat,
      lon: HAITI.lon,
      city: "Port-au-Prince",
      countryCode: "HT",
      localeHint: "fr-HT",
      updatedAt: 1,
    });
    assert.equal(kept.city, "Port-au-Prince");
  });

  it("keeps ?city= override including Gatineau", () => {
    const gatineau = placeFromCityName("Gatineau");
    assert.equal(gatineau.city, "Gatineau");
    const pap = placeFromCityName("Port-au-Prince");
    assert.equal(pap.city, "Port-au-Prince");
    assert.equal(pap.countryCode, "HT");
  });

  it("uses neighbourhood branding until a city is known", () => {
    const pending = brandingForPlace("", "fr", {
      neighborhood: "votre quartier",
      demonym: "habitants du quartier",
    });
    assert.equal(pending.resolved, false);
    assert.equal(pending.city, "votre quartier");
    assert.equal(pending.placeName, "VOTRE QUARTIER");
    assert.equal(pending.demonym, "habitants du quartier");

    const live = brandingForPlace("Port-au-Prince", "fr", {
      neighborhood: "votre quartier",
      demonym: "habitants du quartier",
    });
    assert.equal(live.resolved, true);
    assert.equal(live.city, "Port-au-Prince");
    assert.equal(live.placeName, "PORT-AU-PRINCE");
  });

  it("welcome speech uses the live city, not the seed", () => {
    const spoken = interpolate(fr.welcome, { city: "Port-au-Prince" });
    assert.match(spoken, /Port-au-Prince/);
    assert.doesNotMatch(spoken, /Gatineau/);
  });

  it("waits for GPS reverse-geocode before the first welcome", () => {
    assert.equal(
      welcomeSpeechReady({
        consent: "unset",
        locating: false,
        hasOverride: false,
        waitingOnConsent: true,
      }),
      false,
    );
    assert.equal(
      welcomeSpeechReady({
        consent: "granted",
        locating: true,
        hasOverride: false,
        waitingOnConsent: false,
      }),
      false,
    );
    assert.equal(
      welcomeSpeechReady({
        consent: "granted",
        locating: false,
        hasOverride: false,
        waitingOnConsent: false,
      }),
      true,
    );
    assert.equal(
      welcomeSpeechReady({
        consent: "skipped",
        locating: false,
        hasOverride: false,
        waitingOnConsent: false,
      }),
      true,
    );
  });

  it("re-speaks when a real city replaces the placeholder", () => {
    assert.equal(
      shouldRespeakWelcome({
        previousCity: "votre quartier",
        nextCity: "Port-au-Prince",
        nextResolved: true,
      }),
      true,
    );
    assert.equal(
      shouldRespeakWelcome({
        previousCity: "Gatineau",
        nextCity: "Port-au-Prince",
        nextResolved: true,
      }),
      true,
    );
    assert.equal(
      shouldRespeakWelcome({
        previousCity: "Port-au-Prince",
        nextCity: "votre quartier",
        nextResolved: false,
      }),
      false,
    );
  });
});

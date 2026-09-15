import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLatLon } from "../../workers/xsnow-chat/src/geo.ts";
import { lookupKnownCity } from "./demonym.ts";
import { fr } from "./i18n/fr.ts";
import { interpolate } from "./i18n/locales.ts";
import {
  frenchVoiceLangFor,
  geoResultFromPayload,
  inferLocaleHint,
  parseCityOverride,
  parseGeoPromptOverride,
} from "./geo-logic.ts";
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
  });
});

describe("frenchVoiceLangFor", () => {
  it("keeps French even for US locale hints", () => {
    assert.equal(frenchVoiceLangFor("en-US"), "fr-CA");
    assert.equal(frenchVoiceLangFor("fr-FR"), "fr-FR");
    assert.equal(frenchVoiceLangFor("fr-CA"), "fr-CA");
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

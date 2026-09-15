import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { demonymFor } from "./demonym.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import { fr } from "./i18n/fr.ts";
import { detectLocale, hrefWithLang, interpolate, parseLangOverride } from "./i18n/locales.ts";
import { pickSpokenVoice } from "./voices.ts";

describe("detectLocale", () => {
  it("maps fr*/en*/es* and falls back to fr", () => {
    assert.equal(detectLocale(["fr-CA", "en"]), "fr");
    assert.equal(detectLocale(["en-US"]), "en");
    assert.equal(detectLocale(["es-MX", "en"]), "es");
    assert.equal(detectLocale(["de-DE", "ja"]), "fr");
    assert.equal(detectLocale([]), "fr");
  });
});

describe("parseLangOverride", () => {
  it("reads ?lang= for QA screenshots", () => {
    assert.equal(parseLangOverride("?lang=en"), "en");
    assert.equal(parseLangOverride("lang=es&city=Paris"), "es");
    assert.equal(parseLangOverride("?lang=de"), null);
    assert.equal(parseLangOverride("?city=Gatineau"), null);
  });
});

describe("hrefWithLang", () => {
  it("keeps ?lang= only for query-driven UI", () => {
    assert.equal(hrefWithLang("/vie-privee", "fr", "query"), "/vie-privee?lang=fr");
    assert.equal(hrefWithLang("/conditions/", "es", "query"), "/conditions/?lang=es");
    assert.equal(hrefWithLang("/vie-privee", "en", "stored"), "/vie-privee");
    assert.equal(hrefWithLang("/vie-privee", "en", "auto"), "/vie-privee");
  });
});

describe("interpolate", () => {
  it("fills {city} placeholders", () => {
    assert.equal(interpolate("Hello {city}", { city: "Gatineau" }), "Hello Gatineau");
  });
});

describe("car morning offer copy", () => {
  it("keeps FR/EN/ES labels in sync", () => {
    assert.equal(fr.menu.carMorning, "Prêt de voiture (matins)");
    assert.equal(fr.menu.offres, "Offres");
    assert.equal(en.menu.offres, "Offers");
    assert.equal(es.menu.offres, "Ofertas");
    assert.ok(en.offers.insuranceLabel);
    assert.ok(es.offers.paymentTitle);
    assert.match(fr.offers.insuranceHint, /assureur/);
    assert.match(en.offers.terms, /not the insurer/);
    assert.equal(fr.offers.shareEdit, "Modifier");
    assert.equal(fr.offers.shareCopy, "Copier");
    assert.equal(en.offers.shareEdit, "Edit");
    assert.equal(en.offers.shareCopy, "Copy");
    assert.equal(es.offers.shareEdit, "Editar");
    assert.equal(es.offers.shareCopy, "Copiar");
    assert.match(fr.offers.publishSuccess, /Modifier/);
    assert.match(fr.offers.publishSuccessLink, /En demande/);
    assert.match(en.offers.emptyList, /In demand/);
    assert.match(es.offers.emptyRequests, /solicitudes/);
    assert.deepEqual(Object.keys(en.offers), Object.keys(fr.offers));
    assert.deepEqual(Object.keys(es.offers), Object.keys(fr.offers));
  });
});

describe("wallet copy", () => {
  it("keeps FR/EN/ES Connect labels in sync", () => {
    assert.deepEqual(Object.keys(en.wallet), Object.keys(fr.wallet));
    assert.deepEqual(Object.keys(es.wallet), Object.keys(fr.wallet));
    assert.equal(fr.wallet.connect, "Connect");
    assert.equal(en.wallet.connect, "Connect");
    assert.equal(es.wallet.connect, "Connect");
    assert.equal(fr.wallet.wrongNetwork, "Mauvais réseau");
    assert.equal(en.wallet.wrongNetwork, "Wrong network");
    assert.equal(es.wallet.wrongNetwork, "Red incorrecta");
    assert.match(fr.wallet.needsConfig, /WalletConnect/);
    assert.match(fr.wallet.needsConfig, /configur/);
    assert.match(en.wallet.needsConfig, /not configured/i);
    assert.match(es.wallet.needsConfig, /no está configurado/);
  });
});

describe("install tip copy", () => {
  it("keeps iOS home-screen steps in FR/EN/ES", () => {
    assert.match(fr.install.tip, /Partager/);
    assert.match(fr.install.tip, /écran d’accueil/);
    assert.match(en.install.tip, /Share/);
    assert.match(en.install.tip, /Home Screen/);
    assert.match(es.install.tip, /Compartir/);
    assert.match(es.install.tip, /pantalla de inicio/);
    assert.equal(fr.install.dismiss, "Compris");
    assert.equal(en.install.dismiss, "Got it");
    assert.equal(es.install.dismiss, "Entendido");
  });
});

describe("welcome and system prompt follow UI locale", () => {
  it("keeps French copy by default", () => {
    assert.match(interpolate(fr.welcome, { city: "New York" }), /voisins de New York/);
    assert.match(
      interpolate(fr.systemPrompt, { city: "New York", placeName: "NEW YORK", avatar: "" }),
      /uniquement en français/,
    );
  });

  it("switches English and Spanish", () => {
    assert.match(interpolate(en.welcome, { city: "New York" }), /neighbours in New York/);
    assert.match(
      interpolate(en.systemPrompt, { city: "New York", placeName: "NEW YORK", avatar: "" }),
      /only in English/,
    );
    assert.match(interpolate(es.welcome, { city: "Gatineau" }), /vecinos de Gatineau/);
    assert.match(
      interpolate(es.systemPrompt, { city: "Gatineau", placeName: "GATINEAU", avatar: "" }),
      /únicamente en español/,
    );
  });
});

describe("legal copy is present in FR/EN/ES", () => {
  it("keeps the same privacy and terms section counts", () => {
    assert.equal(fr.legal.privacy.sections.length, 6);
    assert.equal(en.legal.privacy.sections.length, fr.legal.privacy.sections.length);
    assert.equal(es.legal.privacy.sections.length, fr.legal.privacy.sections.length);
    assert.equal(en.legal.terms.sections.length, fr.legal.terms.sections.length);
    assert.equal(es.legal.terms.sections.length, fr.legal.terms.sections.length);
    assert.match(fr.legal.privacy.draft, /Loi 25/);
    assert.match(en.legal.privacy.draft, /Law 25/);
    assert.match(es.legal.privacy.draft, /Ley 25/);
  });
});

describe("demonymFor locales", () => {
  it("translates footer gentilés", () => {
    assert.equal(demonymFor("Gatineau", "fr"), "Gatinois");
    assert.equal(demonymFor("Gatineau", "en"), "Gatineau residents");
    assert.equal(demonymFor("New York", "en"), "New Yorkers");
    assert.equal(demonymFor("New York", "es"), "los neoyorquinos");
    assert.equal(demonymFor("Springfield", "en"), "residents of Springfield");
    assert.equal(demonymFor("Springfield", "es"), "los habitantes de Springfield");
  });
});

describe("pickSpokenVoice", () => {
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
    voice("Alex", "en-US", "male"),
    voice("Thomas", "fr-FR", "male"),
    voice("Amélie", "fr-CA", "female"),
    voice("Nicolas", "fr-CA", "male"),
    voice("Monica", "es-ES", "female"),
    voice("Jorge", "es-MX", "male"),
  ];

  it("keeps UI language and prefers regional + gender", () => {
    assert.equal(pickSpokenVoice(voices, "female", "fr", "fr-CA")?.name, "Amélie");
    assert.equal(pickSpokenVoice(voices, "male", "en", "en-US")?.name, "Alex");
    assert.equal(pickSpokenVoice(voices, "female", "en", "en-US")?.name, "Samantha");
    assert.equal(pickSpokenVoice(voices, "male", "es", "es-MX")?.name, "Jorge");
    assert.ok(pickSpokenVoice(voices, "female", "es", "es-ES")?.lang.toLowerCase().startsWith("es"));
  });

  it("does not pick another language when the UI language has a voice", () => {
    const english = pickSpokenVoice(voices, "female", "en", "fr-CA");
    assert.equal(english?.name, "Samantha");
    assert.ok(english?.lang.toLowerCase().startsWith("en"));
  });
});

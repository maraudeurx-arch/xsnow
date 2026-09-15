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
    assert.equal(fr.wallet.wrongNetwork, "Changer de réseau");
    assert.equal(en.wallet.wrongNetwork, "Switch network");
    assert.equal(es.wallet.wrongNetwork, "Cambiar de red");
    const walletTerms = (sections: { heading: string; body: string }[]) =>
      sections.find((section) => /portefeuille|wallet|cartera/i.test(section.heading));
    const frWallet = walletTerms(fr.legal.terms.sections);
    const enWallet = walletTerms(en.legal.terms.sections);
    const esWallet = walletTerms(es.legal.terms.sections);
    assert.ok(frWallet && enWallet && esWallet);
    assert.doesNotMatch(frWallet.body, /Sepolia/);
    assert.doesNotMatch(enWallet.body, /Sepolia/);
    assert.doesNotMatch(esWallet.body, /Sepolia/);
    assert.match(enWallet.body, /mainnet/i);
    assert.match(frWallet.body, /réseau principal/);
    assert.match(esWallet.body, /red principal/);
    assert.match(fr.wallet.needsConfig, /WalletConnect/);
    assert.match(fr.wallet.needsConfig, /configur/);
    assert.match(en.wallet.needsConfig, /not configured/i);
    assert.match(es.wallet.needsConfig, /no está configurado/);
  });
});

describe("vos idees copy", () => {
  it("keeps FR/EN/ES idea capture in sync", () => {
    assert.equal(fr.nav.vosIdees, "Vos idées");
    assert.equal(en.nav.vosIdees, "Your ideas");
    assert.equal(es.nav.vosIdees, "Tus ideas");
    assert.match(fr.menu.vosIdees, /S’impliquer/);
    assert.match(en.menu.vosIdees, /Get involved/);
    assert.match(es.menu.vosIdees, /Implicarte/);
    assert.equal(fr.chat.ideaPrompt, "Une idée pour la communauté ?");
    assert.equal(en.ideas.tete, "Head");
    assert.equal(es.ideas.mains, "Manos");
    assert.deepEqual(Object.keys(en.ideas), Object.keys(fr.ideas));
    assert.deepEqual(Object.keys(es.ideas), Object.keys(fr.ideas));
    assert.deepEqual(Object.keys(en.chat), Object.keys(fr.chat));
    assert.deepEqual(Object.keys(es.chat), Object.keys(fr.chat));
    assert.deepEqual(Object.keys(en.shareOpc), Object.keys(fr.shareOpc));
    assert.deepEqual(Object.keys(es.shareOpc), Object.keys(fr.shareOpc));
    assert.deepEqual(Object.keys(en.feedback), Object.keys(fr.feedback));
    assert.deepEqual(Object.keys(es.feedback), Object.keys(fr.feedback));
    assert.equal(fr.shareOpc.title, "Partager OPC");
    assert.ok(fr.features.vosIdees.title);
    assert.match(fr.systemPrompt, /Vos idées/);
    assert.match(en.systemPrompt, /Your ideas/);
    assert.match(es.systemPrompt, /Tus ideas/);
    assert.match(fr.welcome, /Vos idées/);
  });
});

describe("gagner maintenant copy", () => {
  it("keeps three honest paths and the anti-pattern in FR/EN/ES", () => {
    assert.equal(fr.menu.gagnerMaintenant, "Gagner maintenant");
    assert.equal(en.menu.gagnerMaintenant, "Earn now");
    assert.equal(es.menu.gagnerMaintenant, "Ganar ahora");
    assert.equal(fr.gagner.neighborsTitle, "Offres voisins");
    assert.equal(fr.gagner.missionsTitle, "Missions payées");
    assert.equal(fr.gagner.timeTitle, "Temps & connexion");
    assert.match(fr.gagner.antiPattern, /pubs en boucle/);
    assert.match(fr.gagner.antiPattern, /fermes de clics/);
    assert.match(en.gagner.antiPattern, /ads in a loop/);
    assert.match(en.gagner.antiPattern, /click farms/);
    assert.match(es.gagner.antiPattern, /anuncios en bucle/);
    assert.match(es.gagner.antiPattern, /granjas de clics/);
    assert.match(fr.gagner.missionsBody, /tests UX/i);
    assert.equal(fr.gagner.missionsMicro1Title, "Annotation IA / robots (micro1)");
    assert.equal(en.gagner.missionsMicro1Title, "AI / robot annotation (micro1)");
    assert.equal(es.gagner.missionsMicro1Title, "Anotación IA / robots (micro1)");
    assert.match(fr.gagner.missionsMicro1Body, /50–90 USD/);
    assert.match(fr.gagner.missionsMicro1Body, /Candidature uniquement chez micro1/);
    assert.match(en.gagner.missionsMicro1Body, /US\$50–90/);
    assert.match(en.gagner.missionsMicro1Body, /Apply only on micro1/);
    assert.match(es.gagner.missionsMicro1Body, /50–90 USD/);
    assert.match(es.gagner.missionsMicro1Body, /sitio de micro1/);
    assert.match(fr.gagner.missionsMicro1Disclaimer, /Tarif non garanti/);
    assert.match(fr.gagner.missionsMicro1Disclaimer, /n’est pas l’employeur/);
    assert.match(fr.gagner.missionsMicro1Disclaimer, /aucun paiement à OPC/);
    assert.match(en.gagner.missionsMicro1Disclaimer, /Rate not guaranteed/);
    assert.match(en.gagner.missionsMicro1Disclaimer, /not the employer/);
    assert.match(en.gagner.missionsMicro1Disclaimer, /no payment to OPC/);
    assert.match(es.gagner.missionsMicro1Disclaimer, /Tarifa no garantizada/);
    assert.match(es.gagner.missionsMicro1Disclaimer, /no es el empleador/);
    assert.match(es.gagner.missionsMicro1Disclaimer, /no pagues a OPC/);
    assert.doesNotMatch(fr.gagner.missionsMicro1Body, /10\s*k|10\s*000|7 jours/i);
    assert.doesNotMatch(en.gagner.missionsMicro1Body, /10k|7 days/i);
    assert.doesNotMatch(fr.gagner.missionsMicro1Body, /OPC paie/);
    assert.doesNotMatch(en.gagner.missionsMicro1Body, /OPC pays/i);
    assert.match(fr.gagner.bandwidthNote, /FAI/);
    assert.match(en.gagner.bandwidthNote, /ISP/);
    assert.deepEqual(Object.keys(en.gagner), Object.keys(fr.gagner));
    assert.deepEqual(Object.keys(es.gagner), Object.keys(fr.gagner));
    assert.deepEqual(Object.keys(en.features), Object.keys(fr.features));
    assert.deepEqual(Object.keys(es.features), Object.keys(fr.features));
    assert.ok(fr.features.gagnerMaintenant.title);
    assert.match(fr.systemPrompt, /Gagner maintenant/);
    assert.match(en.systemPrompt, /Earn now/);
    assert.match(es.systemPrompt, /Ganar ahora/);
  });
});

describe("install tip copy", () => {
  it("keeps iOS home-screen steps in FR/EN/ES", () => {
    assert.match(fr.install.tip, /Partager/);
    assert.match(fr.install.tip, /écran d’accueil/);
    assert.match(fr.install.tipAndroid, /Android/);
    assert.match(fr.install.tipAndroid, /écran d’accueil/);
    assert.match(en.install.tipAndroid, /Home screen/i);
    assert.match(es.install.tipAndroid, /pantalla de inicio/);
    assert.match(en.install.tip, /Share/);
    assert.match(en.install.tip, /Home Screen/);
    assert.match(es.install.tip, /Compartir/);
    assert.match(es.install.tip, /pantalla de inicio/);
    assert.equal(fr.install.dismiss, "Compris");
    assert.equal(en.install.dismiss, "Got it");
    assert.equal(es.install.dismiss, "Entendido");
    assert.deepEqual(Object.keys(en.install), Object.keys(fr.install));
    assert.deepEqual(Object.keys(es.install), Object.keys(fr.install));
    assert.match(fr.chat.micPermission, /Android/);
    assert.match(en.chat.micPermission, /Android/);
    assert.match(es.chat.micPermission, /Android/);
    assert.match(fr.geo.errors.denied, /Android/);
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

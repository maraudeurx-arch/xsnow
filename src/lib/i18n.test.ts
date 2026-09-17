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
    assert.equal(hrefWithLang("/vos-idees/#form", "en", "query"), "/vos-idees/?lang=en#form");
  });
});

describe("interpolate", () => {
  it("fills {city} placeholders", () => {
    assert.equal(interpolate("Hello {city}", { city: "Gatineau" }), "Hello Gatineau");
  });

  it("fills several keys and leaves unknown ones empty", () => {
    assert.equal(
      interpolate("{community} — {slogan}", { community: "Open Community", slogan: "Monétisé Vous!" }),
      "Open Community — Monétisé Vous!",
    );
    assert.equal(interpolate("Ville {city}", {}), "Ville ");
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
    assert.equal(fr.nav.backHome, "Retour à l’accueil");
    assert.equal(en.nav.backHome, "Back to Home");
    assert.equal(es.nav.backHome, "Volver al inicio");
    assert.ok(fr.nav.backHomeAria);
    assert.deepEqual(Object.keys(en.nav), Object.keys(fr.nav));
    assert.deepEqual(Object.keys(es.nav), Object.keys(fr.nav));
    assert.match(fr.menu.vosIdees, /S’impliquer/);
    assert.match(en.menu.vosIdees, /Get involved/);
    assert.match(es.menu.vosIdees, /Implicarte/);
    assert.equal(fr.chat.ideaPrompt, "Une idée pour la communauté ?");
    assert.equal(en.ideas.tete, "Head");
    assert.equal(es.ideas.mains, "Manos");
    assert.deepEqual(Object.keys(en.ideas), Object.keys(fr.ideas));
    assert.deepEqual(Object.keys(es.ideas), Object.keys(fr.ideas));
    assert.deepEqual(Object.keys(en.ownerIdeas), Object.keys(fr.ownerIdeas));
    assert.deepEqual(Object.keys(es.ownerIdeas), Object.keys(fr.ownerIdeas));
    assert.deepEqual(Object.keys(en.chat), Object.keys(fr.chat));
    assert.deepEqual(Object.keys(es.chat), Object.keys(fr.chat));
    assert.deepEqual(Object.keys(en.shareOpc), Object.keys(fr.shareOpc));
    assert.deepEqual(Object.keys(es.shareOpc), Object.keys(fr.shareOpc));
    assert.deepEqual(Object.keys(en.register), Object.keys(fr.register));
    assert.deepEqual(Object.keys(es.register), Object.keys(fr.register));
    assert.equal(fr.register.cta, "S’inscrire");
    assert.equal(en.register.cta, "Sign up");
    assert.equal(es.register.cta, "Inscribirse");
    assert.equal(fr.features.monProfil.lead, "");
    assert.equal(en.features.monProfil.lead, "");
    assert.equal(es.features.monProfil.lead, "");
    assert.match(fr.register.memberNumberHint, /OPC-XXXX/);
    assert.equal(fr.register.share, "Partager");
    assert.equal(en.register.share, "Share");
    assert.equal(es.register.share, "Compartir");
    assert.equal(fr.profile.reglages, "Réglages");
    assert.equal(fr.profile.aPropos, "À propos de Open Community (OPC)");
    assert.equal(en.profile.reglages, "Settings");
    assert.equal(es.profile.reglages, "Ajustes");
    // Mes infos hub entry removed — edit path is Modifier le profil; legacy infos strings may remain.
    assert.equal(fr.profile.infos, "Mes infos");
    assert.equal(en.profile.infos, "My info");
    assert.equal(es.profile.infos, "Mis datos");
    assert.equal(fr.register.shareEdit, "Modifier");
    assert.equal(fr.register.shareCopy, "Copier");
    assert.match(fr.legal.privacy.sections[1].body, /OPC-XXXX/);
    assert.match(fr.legal.privacy.sections[1].body, /opencommunity\.opc@gmail\.com/);
    assert.match(en.legal.privacy.sections[1].body, /opencommunity\.opc@gmail\.com/);
    assert.match(es.legal.privacy.sections[1].body, /opencommunity\.opc@gmail\.com/);
    assert.match(en.legal.privacy.sections[1].body, /profile server/);
    assert.match(es.legal.privacy.sections[1].body, /servidor de perfiles/);
    assert.deepEqual(Object.keys(en.feedback), Object.keys(fr.feedback));
    assert.deepEqual(Object.keys(es.feedback), Object.keys(fr.feedback));
    assert.equal(fr.shareOpc.title, "Partager OPC");
    assert.equal(fr.features.vosIdees.title, "");
    assert.equal(fr.features.vosIdees.lead, "");
    assert.equal(en.features.vosIdees.title, "");
    assert.equal(en.features.vosIdees.lead, "");
    assert.equal(es.features.vosIdees.title, "");
    assert.equal(es.features.vosIdees.lead, "");
    assert.equal(fr.ideas.textLabel, "Ton idée");
    assert.equal(en.ideas.textLabel, "Your idea");
    assert.equal(es.ideas.textLabel, "Tu idea");
    assert.equal(fr.ideas.submit, "Envoyer l’idée");
    assert.equal(en.ideas.submit, "Send the idea");
    assert.equal(es.ideas.submit, "Enviar la idea");
    assert.match(fr.ideas.wallHint, /opencommunity\.opc@gmail\.com/);
    assert.match(fr.ideas.wallHint, /équipe de développement/);
    assert.match(fr.ideas.wallHint, /maraudeurx-arch/);
    assert.equal(fr.ideas.submitHint, "");
    assert.match(fr.ideas.thankYouBody, /opencommunity\.opc@gmail\.com/);
    assert.equal(fr.ownerIdeas.empty.includes("invent"), true);
    assert.equal(fr.ideas.thankYou, "Idée bien reçue");
    assert.equal(en.ideas.thankYou, "Idea received");
    assert.equal(es.ideas.thankYou, "Idea bien recibida");
    assert.equal(fr.ideas.newIdea, "Ajouter une autre idée");
    assert.equal(en.ideas.newIdea, "Add another idea");
    assert.equal(es.ideas.newIdea, "Añadir otra idea");
    assert.match(fr.ideas.thankYouBody, /cet appareil/);
    assert.match(en.ideas.thankYouBody, /this device/);
    assert.match(es.ideas.thankYouBody, /este aparato/);
    assert.doesNotMatch(fr.ideas.thankYouBody, /serveur|GitHub|catalogue public/i);
    assert.doesNotMatch(en.ideas.thankYouBody, /server|GitHub|public catalog/i);
    assert.doesNotMatch(es.ideas.thankYouBody, /servidor|GitHub|catálogo público/i);
    assert.equal("openCta" in fr.ideas, false);
    assert.equal("retryInbox" in fr.ideas, false);
    assert.equal("retryInbox" in en.ideas, false);
    assert.equal("retryInbox" in es.ideas, false);
    assert.match(fr.systemPrompt, /Vos idées/);
    assert.match(en.systemPrompt, /Your ideas/);
    assert.match(es.systemPrompt, /Tus ideas/);
    assert.match(fr.welcome, /Vos idées/);
    assert.equal(fr.neighborhoodNews.title, "Nouvelles du Quartier");
    assert.equal(en.neighborhoodNews.title, "Neighbourhood News");
    assert.equal(es.neighborhoodNews.title, "Noticias del Barrio");
    assert.deepEqual(Object.keys(en.neighborhoodNews), Object.keys(fr.neighborhoodNews));
    assert.deepEqual(Object.keys(es.neighborhoodNews), Object.keys(fr.neighborhoodNews));
    assert.match(fr.systemPrompt, /Nouvelles du Quartier/);
    assert.match(fr.neighborhoodNews.promptNoHeadlines, /ne fabrique jamais/);
    assert.equal(fr.neighborhoodNews.partnerSlot, "Espace partenaire");
    assert.equal(en.neighborhoodNews.partnerSlot, "Partner space");
    assert.equal(es.neighborhoodNews.partnerSlot, "Espacio para socios");
    assert.match(fr.neighborhoodNews.partnerPlaceholder, /ferme à clics/);
    assert.match(fr.neighborhoodNews.partnerFunding, /Grok et Cursor/);
    assert.equal(fr.neighborhoodNews.partnerCtaRegister, "S’inscrire / Mes infos");
    assert.equal(en.neighborhoodNews.partnerCtaRegister, "Sign up / My info");
    assert.equal(es.neighborhoodNews.partnerCtaRegister, "Inscribirse / Mis datos");
    assert.equal(fr.neighborhoodNews.partnerCtaShare, "Partager / inviter");
    assert.equal(en.neighborhoodNews.partnerCtaShare, "Share / invite");
    assert.equal(es.neighborhoodNews.partnerCtaShare, "Compartir / invitar");
    assert.match(fr.neighborhoodNews.partnerGrowRegisterName, /exemple/);
    assert.match(en.neighborhoodNews.partnerGrowRegisterName, /example/i);
    assert.match(es.neighborhoodNews.partnerGrowShareName, /ejemplo/i);
    assert.match(fr.neighborhoodNews.partnerGrowRegisterTagline, /fausse manchette/);
    assert.match(fr.neighborhoodNews.partnerGrowShareTagline, /Invite un voisin/);
    assert.equal(fr.neighborhoodNews.retry, "Réessayer");
  });
});

describe("gagner maintenant copy", () => {
  it("drops the board heading and explains unaffiliated phone work in FR/EN/ES", () => {
    assert.equal(fr.menu.gagnerMaintenant, "Gagner maintenant");
    assert.equal(en.menu.gagnerMaintenant, "Earn now");
    assert.equal(es.menu.gagnerMaintenant, "Ganar ahora");
    assert.equal(fr.features.gagnerMaintenant.title, "");
    assert.equal(en.features.gagnerMaintenant.title, "");
    assert.equal(es.features.gagnerMaintenant.title, "");
    assert.match(fr.features.gagnerMaintenant.lead, /pas affiliées à OPC \/ Open Community/);
    assert.match(fr.features.gagnerMaintenant.lead, /téléphone/);
    assert.match(fr.features.gagnerMaintenant.lead, /gagner de l’argent/);
    assert.match(en.features.gagnerMaintenant.lead, /not affiliated with OPC \/ Open Community/);
    assert.match(en.features.gagnerMaintenant.lead, /phone/);
    assert.match(en.features.gagnerMaintenant.lead, /earn money/);
    assert.match(es.features.gagnerMaintenant.lead, /no están afiliadas a OPC \/ Open Community/);
    assert.match(es.features.gagnerMaintenant.lead, /teléfono/);
    assert.match(es.features.gagnerMaintenant.lead, /ganar dinero/);
    for (const lead of [
      fr.features.gagnerMaintenant.lead,
      en.features.gagnerMaintenant.lead,
      es.features.gagnerMaintenant.lead,
    ]) {
      const sentences = lead.split(/(?<=\.)\s+/).filter(Boolean);
      assert.ok(sentences.length >= 2 && sentences.length <= 3, lead);
    }
    assert.equal("gagner" in fr, false);
    assert.equal("gagner" in en, false);
    assert.equal("gagner" in es, false);
    assert.doesNotMatch(fr.features.gagnerMaintenant.lead, /Trois chemins/);
    assert.deepEqual(Object.keys(en.features), Object.keys(fr.features));
    assert.deepEqual(Object.keys(es.features), Object.keys(fr.features));
    assert.match(fr.systemPrompt, /Gagner maintenant/);
    assert.match(en.systemPrompt, /Earn now/);
    assert.match(es.systemPrompt, /Ganar ahora/);
  });
});


describe("mes services / en demande four buttons", () => {
  it("clears board leads and keeps four FR/EN/ES CTA labels", () => {
    assert.equal(fr.features.mesServices.title, "Mes services");
    assert.equal(fr.features.mesServices.lead, "");
    assert.equal(en.features.mesServices.lead, "");
    assert.equal(es.features.mesServices.lead, "");
    assert.equal(fr.features.enDemande.title, "En demande");
    assert.equal(fr.features.enDemande.lead, "");
    assert.equal(en.features.enDemande.lead, "");
    assert.equal(es.features.enDemande.lead, "");
    assert.equal(fr.mesServicesButtons.skills, "Mes compétences");
    assert.equal(fr.mesServicesButtons.babysitting, "Baby-sitting");
    assert.equal(fr.enDemandeButtons.diy, "Aide au bricolage");
    assert.equal(fr.enDemandeButtons.carpool, "Co-voiturage");
    assert.deepEqual(Object.keys(en.mesServicesButtons), Object.keys(fr.mesServicesButtons));
    assert.deepEqual(Object.keys(en.skills), Object.keys(fr.skills));
    assert.deepEqual(Object.keys(es.skills), Object.keys(fr.skills));
    assert.deepEqual(Object.keys(es.enDemandeButtons), Object.keys(fr.enDemandeButtons));
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
    assert.equal(fr.install.profileTitle, "Mettre OPC sur l’écran d’accueil");
    assert.equal(en.install.profileTitle, "Put OPC on the Home Screen");
    assert.equal(es.install.profileTitle, "Poner OPC en la pantalla de inicio");
    assert.match(fr.install.profileLead, /app web/);
    assert.match(fr.install.profileLead, /App Store/);
    assert.match(en.install.profileLead, /web app/);
    assert.match(es.install.profileLead, /app web/);
    assert.equal(fr.install.iphoneHeading, "iPhone (Safari)");
    assert.equal(fr.install.iphoneSteps.length, 3);
    assert.equal(en.install.iphoneSteps.length, 3);
    assert.equal(es.install.iphoneSteps.length, 3);
    assert.match(fr.install.iphoneSteps[0]!, /https:\/\/opencommunity\.app\//);
    assert.match(en.install.iphoneSteps[0]!, /https:\/\/opencommunity\.app\//);
    assert.match(es.install.iphoneSteps[0]!, /https:\/\/opencommunity\.app\//);
    assert.match(fr.install.iphoneSteps[1]!, /Partager/);
    assert.match(fr.install.iphoneSteps[2]!, /Sur l’écran d’accueil/);
    assert.match(en.install.iphoneSteps[1]!, /Share/);
    assert.match(en.install.iphoneSteps[2]!, /Add to Home Screen/);
    assert.match(es.install.iphoneSteps[1]!, /Compartir/);
    assert.match(es.install.iphoneSteps[2]!, /pantalla de inicio/);
    assert.match(fr.install.siteUrlLabel, /Safari/);
    assert.match(en.install.siteUrlLabel, /Safari/);
    assert.match(es.install.siteUrlLabel, /Safari/);
    assert.match(fr.install.profileLead, /https:\/\/opencommunity\.app\//);
    assert.match(en.install.profileLead, /https:\/\/opencommunity\.app\//);
    assert.match(es.install.profileLead, /https:\/\/opencommunity\.app\//);
    assert.match(fr.install.tip, /https:\/\/opencommunity\.app\//);
    assert.match(fr.install.wrongShortcut, /There isn’t a GitHub Pages site here/);
    assert.match(fr.install.wrongShortcut, /opencommunity\.app/);
    assert.match(fr.install.wrongShortcut, /maraudeurx-arch\.github\.io\/xsnow\//);
    assert.match(en.install.wrongShortcut, /There isn’t a GitHub Pages site here/);
    assert.match(es.install.wrongShortcut, /There isn’t a GitHub Pages site here/);
    assert.match(fr.notFound.githubPagesHint, /https:\/\/opencommunity\.app\//);
    assert.match(en.notFound.githubPagesHint, /https:\/\/opencommunity\.app\//);
    assert.match(es.notFound.githubPagesHint, /https:\/\/opencommunity\.app\//);
    assert.deepEqual(Object.keys(en.install), Object.keys(fr.install));
    assert.deepEqual(Object.keys(es.install), Object.keys(fr.install));
    assert.match(fr.chat.micPermission, /Android/);
    assert.match(en.chat.micPermission, /Android/);
    assert.match(es.chat.micPermission, /Android/);
    assert.match(fr.geo.errors.denied, /Android/);
  });
});

describe("home shortcut copy", () => {
  it("keeps FR/EN/ES idea and share chips plus the full chat placeholder", () => {
    assert.equal(fr.guide.vosIdees, "Vos idées");
    assert.equal(en.guide.vosIdees, "Your ideas");
    assert.equal(es.guide.vosIdees, "Tus ideas");
    assert.equal(fr.guide.partager, "Partager");
    assert.equal(en.guide.partager, "Share");
    assert.equal(es.guide.partager, "Compartir");
    assert.match(fr.guide.offerShortcuts, /S’inscrire/);
    assert.match(en.guide.offerShortcuts, /Sign up/);
    assert.match(es.guide.offerShortcuts, /Inscribirse/);
    assert.equal(fr.chat.placeholder, "Écris à ton avatar…");
    assert.ok(!fr.chat.placeholder.includes("avate"));
    assert.deepEqual(Object.keys(en.guide), Object.keys(fr.guide));
    assert.deepEqual(Object.keys(es.guide), Object.keys(fr.guide));
  });
});

describe("spoken welcome omits head/heart/hands", () => {
  it("strips Tête/Cœur/Mains from welcome and avatar prompts, keeps form labels", () => {
    assert.doesNotMatch(fr.welcome, /Tête|Cœur|Mains/);
    assert.doesNotMatch(fr.systemPrompt, /Tête|Cœur|Mains/);
    assert.doesNotMatch(en.welcome, /\bHead\b|\bHeart\b|\bHands\b/);
    assert.doesNotMatch(en.systemPrompt, /\bHead\b|\bHeart\b|\bHands\b/);
    assert.doesNotMatch(es.welcome, /Cabeza|Corazón|Manos/);
    assert.doesNotMatch(es.systemPrompt, /Cabeza|Corazón|Manos/);
    assert.match(fr.welcome, /Vos idées/);
    assert.match(en.welcome, /Your ideas/);
    assert.match(es.welcome, /Tus ideas/);
    assert.equal(fr.ideas.tete, "Tête");
    assert.equal(fr.ideas.coeur, "Cœur");
    assert.equal(fr.ideas.mains, "Mains");
    assert.equal(en.ideas.tete, "Head");
    assert.equal(es.ideas.tete, "Cabeza");
  });
});

describe("welcome and system prompt follow UI locale", () => {
  it("keeps French copy by default, without a city name", () => {
    assert.match(fr.welcome, /gens d’ici/);
    assert.match(fr.welcome, /Open Community/);
    assert.match(fr.welcome, /Vos idées/);
    assert.doesNotMatch(fr.welcome, /\{city\}/);
    assert.doesNotMatch(fr.welcome, /Gatineau/);
    assert.match(
      interpolate(fr.systemPrompt, { city: "New York", placeName: "NEW YORK", avatar: "" }),
      /uniquement en français/,
    );
  });

  it("switches English and Spanish without a city slot", () => {
    assert.match(en.welcome, /people here/);
    assert.match(en.welcome, /Your ideas/);
    assert.doesNotMatch(en.welcome, /\{city\}/);
    assert.match(
      interpolate(en.systemPrompt, { city: "New York", placeName: "NEW YORK", avatar: "" }),
      /only in English/,
    );
    assert.match(es.welcome, /gente de aquí/);
    assert.match(es.welcome, /Tus ideas/);
    assert.doesNotMatch(es.welcome, /\{city\}/);
    assert.match(
      interpolate(es.systemPrompt, { city: "Gatineau", placeName: "GATINEAU", avatar: "" }),
      /únicamente en español/,
    );
  });
});

describe("legal copy is present in FR/EN/ES", () => {
  it("keeps the same privacy and terms section counts", () => {
    assert.equal(fr.legal.privacy.sections.length, 7);
    assert.equal(en.legal.privacy.sections.length, fr.legal.privacy.sections.length);
    assert.equal(es.legal.privacy.sections.length, fr.legal.privacy.sections.length);
    assert.equal(en.legal.terms.sections.length, fr.legal.terms.sections.length);
    assert.equal(es.legal.terms.sections.length, fr.legal.terms.sections.length);
    assert.match(fr.legal.privacy.draft, /Loi 25/);
    assert.match(en.legal.privacy.draft, /Law 25/);
    assert.match(es.legal.privacy.draft, /Ley 25/);
  });

  it("keeps transparency documents aligned", () => {
    assert.deepEqual(Object.keys(en.legal), Object.keys(fr.legal));
    assert.deepEqual(Object.keys(es.legal), Object.keys(fr.legal));
    assert.deepEqual(Object.keys(en.trust), Object.keys(fr.trust));
    assert.deepEqual(Object.keys(es.trust), Object.keys(fr.trust));
    assert.deepEqual(Object.keys(en.footer), Object.keys(fr.footer));
    assert.deepEqual(Object.keys(es.footer), Object.keys(fr.footer));
    assert.equal(fr.legal.about.sections.length, 5);
    assert.equal(fr.legal.how.sections.length, 4);
    assert.equal(fr.legal.security.sections.length, 5);
    assert.equal(fr.legal.proofs.sections.length, 3);
    for (const kind of ["about", "how", "security", "proofs"] as const) {
      assert.equal(en.legal[kind].sections.length, fr.legal[kind].sections.length);
      assert.equal(es.legal[kind].sections.length, fr.legal[kind].sections.length);
    }
    assert.match(fr.legal.about.sections[4].body, /version/);
    assert.match(en.legal.about.sections[4].body, /public catalog/i);
    assert.match(es.legal.about.sections[4].body, /catálogo público/);
    assert.match(fr.profile.deviceLocalNote, /cet appareil/);
    assert.match(fr.profile.infosPrivacy, /jamais divulguées/);
    assert.match(fr.profile.infosPrivacy, /vendues/);
    assert.match(fr.profile.infosPrivacy, /OPC/);
    assert.match(en.profile.infosPrivacy, /never be disclosed/);
    assert.match(en.profile.infosPrivacy, /sold/);
    assert.match(es.profile.infosPrivacy, /nunca se divulgará/);
    assert.match(es.profile.infosPrivacy, /venderá/);
    assert.match(en.profile.releaseNotesBody, /0\.3\.5/);
    assert.deepEqual(Object.keys(en.profile), Object.keys(fr.profile));
    assert.deepEqual(Object.keys(es.profile), Object.keys(fr.profile));
  });

  it("does not tell skip/deny visitors they live in Gatineau", () => {
    assert.doesNotMatch(fr.geo.skip, /Gatineau/);
    assert.doesNotMatch(en.geo.skip, /Gatineau/);
    assert.doesNotMatch(es.geo.skip, /Gatineau/);
    assert.doesNotMatch(fr.geo.errors.generic, /Gatineau/);
    assert.doesNotMatch(en.geo.errors.generic, /Gatineau/);
    assert.doesNotMatch(es.geo.errors.generic, /Gatineau/);
    assert.match(fr.place.neighborhood, /quartier/);
    assert.match(en.place.neighborhood, /neighbourhood/);
    assert.match(es.place.neighborhood, /barrio/);
    assert.ok(fr.place.wordmark);
    assert.ok(en.place.wordmark);
    assert.ok(es.place.wordmark);
  });
});

describe("transparency copy stays honest", () => {
  function flattenTrust(messages: typeof fr) {
    const docs = [messages.legal.about, messages.legal.how, messages.legal.security, messages.legal.proofs];
    const parts = [
      messages.legal.about.extra,
      messages.trust.github,
      messages.trust.issues,
      messages.trust.emailLabel,
      messages.trust.securityMd,
      ...docs.flatMap((doc) => [
        doc.title,
        doc.lead,
        doc.draft,
        ...doc.sections.map((section) => `${section.heading} ${section.body}`),
      ]),
    ];
    return parts.join("\n");
  }

  it("names the development team, GitHub, Issues, and the public OPC email — no personal address", () => {
    const publicEmail = /opencommunity\.opc@gmail\.com/;
    for (const pack of [fr, en, es]) {
      const text = flattenTrust(pack);
      assert.doesNotMatch(text, /Politzer/);
      assert.doesNotMatch(text, /\bGOV\b/);
      assert.doesNotMatch(text, /\bGov\b/);
      assert.match(text, /maraudeurx-arch/);
      assert.match(text, /GitHub Issues/);
      assert.match(text, publicEmail);
      assert.doesNotMatch(text, /icloud/i);
      assert.doesNotMatch(text, /Politzerestigene/i);
      assert.doesNotMatch(text, /0x[a-fA-F0-9]{40}/);
      const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
      assert.ok(emails.length > 0);
      for (const email of emails) {
        assert.equal(email.toLowerCase(), "opencommunity.opc@gmail.com");
      }
    }
    assert.match(fr.legal.about.sections[0].body, /équipe de développement/);
    assert.match(en.legal.about.sections[0].body, /development team/);
    assert.match(es.legal.about.sections[0].body, /equipo de desarrollo/);
    assert.match(fr.legal.about.sections[0].body, /pas une société enregistrée/);
    assert.match(en.legal.about.sections[0].body, /not a registered corporation/);
    assert.match(es.legal.about.sections[0].body, /no es una sociedad registrada/);
    assert.match(fr.legal.about.sections[3].body, publicEmail);
    assert.match(fr.legal.security.sections[3].body, publicEmail);
    assert.match(en.legal.security.sections[3].body, publicEmail);
    assert.match(es.legal.security.sections[3].body, publicEmail);
  });

  it("states peer-to-peer payments and no OPC payment contracts", () => {
    assert.match(fr.legal.how.sections[1].body, /pair à pair/);
    assert.match(fr.legal.how.sections[1].body, /Interac/);
    assert.match(fr.legal.how.sections[1].body, /PayPal\.me/);
    assert.match(fr.legal.how.sections[1].body, /ne redistribue pas/);
    assert.match(fr.legal.how.sections[1].body, /escrow/);
    assert.match(en.legal.how.sections[1].body, /peer-to-peer/i);
    assert.match(en.legal.how.sections[1].body, /does not hold/);
    assert.match(es.legal.how.sections[1].body, /entre pares/);
    assert.match(fr.legal.how.sections[2].body, /Aucun revenu n’est garanti/);
    assert.match(en.legal.how.sections[2].body, /No income is guaranteed/);
    assert.match(fr.legal.how.sections[3].body, /Aucun contrat intelligent de paiement OPC/);
    assert.match(en.legal.how.sections[3].body, /No OPC payment smart contracts/);
    assert.match(es.legal.how.sections[3].body, /Ningún contrato inteligente de pago de OPC/);
    assert.match(fr.legal.how.sections[3].body, /WalletConnect/);
    assert.match(en.legal.terms.sections.find((s) => s.heading === "Wallet")!.body, /no OPC payment smart contracts/i);
  });

  it("does not fake an audit or revenue proofs", () => {
    assert.match(fr.legal.security.sections[4].body, /pas encore d’audit de sécurité indépendant/);
    assert.match(en.legal.security.sections[4].body, /no independent third-party security audit yet/i);
    assert.match(es.legal.security.sections[4].body, /Aún no hay una auditoría de seguridad independiente/);
    assert.match(fr.legal.security.sections[0].body, /texte brut/);
    assert.match(en.legal.security.sections[0].body, /plain text/i);
    assert.match(fr.legal.security.sections[0].body, /n’a pas d’upload/);
    assert.match(en.legal.security.sections[2].body, /does not open a pull request/i);
    assert.match(fr.legal.proofs.sections[0].body, /ne revendique aucune preuve de revenus/);
    assert.match(en.legal.proofs.sections[0].body, /claims no revenue proofs/i);
    assert.match(es.legal.proofs.sections[0].body, /no reivindica ninguna prueba de ingresos/);
    assert.match(fr.legal.proofs.draft, /Aucune capture d’écran fabriquée/);
    assert.match(en.legal.proofs.sections[1].body, /consent/);
    for (const pack of [fr, en, es]) {
      const text = flattenTrust(pack);
      assert.doesNotMatch(text, /CertiK|OpenZeppelin|Trail of Bits/i);
    }
  });
});

describe("alertes de proximité copy", () => {
  it("keeps FR/EN/ES alert strings in sync and stays honest about consent", () => {
    assert.deepEqual(Object.keys(en.alerts), Object.keys(fr.alerts));
    assert.deepEqual(Object.keys(es.alerts), Object.keys(fr.alerts));
    assert.deepEqual(Object.keys(en.alerts.days), Object.keys(fr.alerts.days));
    assert.deepEqual(Object.keys(es.alerts.days), Object.keys(fr.alerts.days));
    assert.equal(fr.alerts.person, "Prénom");
    assert.equal(fr.alerts.place, "Endroit où la personne doit être");
    assert.equal(fr.alerts.radius5, "5 km");
    assert.equal(fr.alerts.radius10, "10 km");
    assert.equal(fr.alerts.radius20, "20 km");
    assert.equal(fr.alerts.days.lun, "Lundi");
    assert.equal(fr.alerts.days.dim, "Dimanche");
    assert.match(fr.alerts.honestLead, /Apple Localiser/);
    assert.match(fr.alerts.honestLead, /iCloud/);
    assert.match(fr.alerts.honestLead, /Messages/);
    assert.match(en.alerts.honestLead, /Find My/);
    assert.match(es.alerts.honestLead, /Apple Buscar/);
    assert.match(fr.alerts.honestIos, /écran d’accueil/);
    assert.match(en.alerts.consentAccept, /I agree to share my location/);
    assert.match(fr.alerts.consentAccept, /J’accepte de partager ma position/);
    assert.match(fr.features.alertes.lead, /pas Apple Localiser/);
    assert.match(en.features.alertes.lead, /not Apple Find My/);
    assert.match(fr.legal.privacy.sections[3].body, /Apple Localiser/);
    assert.match(en.legal.privacy.sections[3].body, /Find My/);
    assert.doesNotMatch(fr.alerts.honestLead, /identifiant iCloud d’un proche/i);
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

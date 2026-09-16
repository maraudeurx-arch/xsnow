import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { AD_IMAGE_MAX_BYTES } from "./compress-ad-image.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import { fr } from "./i18n/fr.ts";
import {
  adsEnabled,
  adProvider,
  adsenseSlotId,
  creativeForSlot,
  listPartnerCreatives,
  nextRotationIndex,
  parseAdProvider,
  parseAdsEnabled,
  parseRotationIndex,
  parseVisitorAds,
  partnerCtaKind,
  partnerCreativeDownloadName,
  partnerCreativeImageUrl,
  PARTNER_REGISTER_HREF,
  PARTNER_SHARE_HREF,
  PLACEHOLDER_PARTNERS,
  resolvePartnerCreative,
  usesAdsense,
  visiblePartnerSlots,
  visitorAdToCreative,
} from "./partner-ads.ts";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../../public");

describe("partner ad config", () => {
  it("defaults to labeled placeholder inventory", () => {
    assert.equal(parseAdsEnabled(undefined), true);
    assert.equal(parseAdProvider(undefined), "placeholder");
    assert.equal(adsEnabled({}), true);
    assert.deepEqual(visiblePartnerSlots({}), ["news-mid", "news-bottom"]);
  });

  it("can be turned off without leaving a news-shaped slot", () => {
    assert.equal(parseAdsEnabled("false"), false);
    assert.equal(parseAdProvider("none"), "none");
    assert.equal(adsEnabled({ enabled: "0" }), false);
    assert.deepEqual(visiblePartnerSlots({ enabled: "off" }), []);
    assert.equal(adProvider("adsense", "false"), "none");
  });

  it("only uses AdSense when publisher and unit ids are set", () => {
    assert.equal(
      usesAdsense("news-bottom", {
        provider: "adsense",
        enabled: "true",
        client: "ca-pub-1",
        bottom: "123",
      }),
      true,
    );
    assert.equal(
      usesAdsense("news-bottom", {
        provider: "adsense",
        enabled: "true",
        client: "ca-pub-1",
        bottom: "",
      }),
      false,
    );
    assert.equal(adsenseSlotId("news-mid", { mid: "aaa", bottom: "bbb" }), "aaa");
  });

  it("placeholder copy is Publicité inventory, not a fake headline", () => {
    assert.match(fr.neighborhoodNews.partnerSlot, /Espace partenaire/);
    assert.match(fr.neighborhoodNews.partnerSponsored, /Publicité/);
    assert.doesNotMatch(fr.neighborhoodNews.partnerPlaceholder, /Chargement des nouvelles/);
    assert.match(fr.neighborhoodNews.partnerPlaceholder, /fausse manchette/);
    assert.match(fr.neighborhoodNews.partnerFunding, /pas de revenus pubs en direct/);
    assert.equal(fr.neighborhoodNews.partnerCtaRegister, "S’inscrire / Mes infos");
    assert.equal(fr.neighborhoodNews.partnerCtaShare, "Partager / inviter");
    assert.equal(en.neighborhoodNews.partnerCtaRegister, "Sign up / My info");
    assert.equal(es.neighborhoodNews.partnerCtaShare, "Compartir / invitar");
    assert.equal(fr.neighborhoodNews.partnerDownload, "Télécharger");
    assert.equal(en.neighborhoodNews.partnerDownload, "Download");
    assert.equal(es.neighborhoodNews.partnerDownload, "Descargar");
    assert.match(fr.neighborhoodNews.partnerDownloadAria, /image de la publicité/);
    assert.match(en.neighborhoodNews.partnerDownloadFail, /long-press/i);
    assert.match(es.neighborhoodNews.partnerDownloadIosHint, /iPhone/);
  });

  it("exposes rotating house ads that drive register and share", () => {
    const list = listPartnerCreatives();
    assert.equal(list.length, PLACEHOLDER_PARTNERS.length);
    assert.ok(list.length >= 2);
    assert.deepEqual(
      list.map((creative) => creative.kind),
      ["register", "share", "local", "garderie", "chambre"],
    );
    assert.equal(list[0]?.href, PARTNER_REGISTER_HREF);
    assert.equal(list[1]?.href, PARTNER_SHARE_HREF);
    assert.equal(list[2]?.href, PARTNER_REGISTER_HREF);
    for (const creative of list) {
      assert.ok(creative.id);
      assert.ok(partnerCreativeImageUrl(creative)?.includes("/partners/"));
      assert.match(partnerCreativeDownloadName(creative), /\.(svg|png)$/);
      assert.equal(creative.href === PARTNER_REGISTER_HREF || creative.href === PARTNER_SHARE_HREF, true);
      const resolved = resolvePartnerCreative(creative, fr.neighborhoodNews);
      assert.doesNotMatch(resolved.name, /Chargement des nouvelles/);
      assert.doesNotMatch(resolved.tagline, /Chargement des nouvelles/);
      assert.doesNotMatch(resolved.name, /438\s*869|869-4520/);
      assert.doesNotMatch(resolved.tagline, /438\s*869|869-4520/);
      if (creative.kind === "share") {
        assert.equal(resolved.ctaKind, "share");
        assert.equal(resolved.cta, fr.neighborhoodNews.partnerCtaShare);
        assert.match(resolved.name, /exemple/);
        assert.match(resolved.tagline, /voisin/);
      } else if (creative.kind === "garderie") {
        assert.equal(resolved.ctaKind, "register");
        assert.equal(resolved.name, "Place en garderie du quartier");
        assert.match(resolved.tagline, /Publicité/);
        assert.match(resolved.tagline, /ferme à clics/);
      } else if (creative.kind === "chambre") {
        assert.equal(resolved.ctaKind, "register");
        assert.equal(resolved.name, "Chambre à Gatineau Centre");
        assert.equal(partnerCreativeDownloadName(creative), "chambre-gatineau-centre.png");
        assert.match(resolved.tagline, /Publicité/);
        assert.match(resolved.tagline, /ferme à clics/);
      } else {
        assert.equal(resolved.ctaKind, "register");
        assert.equal(resolved.cta, fr.neighborhoodNews.partnerCtaRegister);
        assert.match(resolved.name, /exemple/);
        assert.match(resolved.tagline, /ferme à clics/);
      }
    }
    const enGarderie = resolvePartnerCreative(list[3]!, en.neighborhoodNews);
    assert.match(enGarderie.name, /daycare/i);
    const enChambre = resolvePartnerCreative(list[4]!, en.neighborhoodNews);
    assert.match(enChambre.name, /Gatineau Centre/);
    assert.doesNotMatch(enChambre.tagline, /438/);
    const esChambre = resolvePartnerCreative(list[4]!, es.neighborhoodNews);
    assert.match(esChambre.name, /Gatineau Centre/);
    const enShare = resolvePartnerCreative(list[1]!, en.neighborhoodNews);
    assert.match(enShare.name, /example/i);
    assert.equal(enShare.cta, "Share / invite");
    const esRegister = resolvePartnerCreative(list[0]!, es.neighborhoodNews);
    assert.match(esRegister.name, /ejemplo/i);
    assert.equal(esRegister.cta, "Inscribirse / Mis datos");
  });

  it("keeps sold-partner name overrides without turning them into headlines", () => {
    const resolved = resolvePartnerCreative(
      {
        id: "sold",
        kind: "local",
        href: "https://example.net/sponsor",
        name: "Café des Pins",
        tagline: "Commandité local — pas une manchette.",
        cta: "Voir le café",
      },
      fr.neighborhoodNews,
    );
    assert.equal(resolved.name, "Café des Pins");
    assert.equal(resolved.cta, "Voir le café");
    assert.equal(partnerCtaKind("local"), "register");
    assert.doesNotMatch(resolved.tagline, /Chargement des nouvelles/);
  });

  it("rotates creatives per slot from a shared cursor", () => {
    assert.equal(parseRotationIndex("2", 3), 2);
    assert.equal(parseRotationIndex("9", 3), 0);
    assert.equal(parseRotationIndex("nope", 3), 0);
    assert.equal(nextRotationIndex(2, 3), 0);
    const mid0 = creativeForSlot("news-mid", 0);
    const bottom0 = creativeForSlot("news-bottom", 0);
    assert.equal(mid0.kind, "register");
    assert.equal(bottom0.kind, "share");
    assert.notEqual(mid0.id, bottom0.id);
    assert.equal(creativeForSlot("news-mid", 1).id, bottom0.id);
  });

  it("ships garderie and chambre flyers as labeled house ads", () => {
    assert.equal(existsSync(join(publicDir, "partners/garderie.svg")), true);
    assert.equal(existsSync(join(publicDir, "partners/chambre-gatineau-centre.png")), true);
    assert.equal(partnerCtaKind("garderie"), "register");
    assert.equal(partnerCtaKind("chambre"), "register");
    const chambre = PLACEHOLDER_PARTNERS.find((item) => item.id === "placeholder-chambre");
    assert.equal(chambre?.imagePath, "/partners/chambre-gatineau-centre.png");
  });

  it("prepends a KB-capped visitor photo without mixing it into news copy", () => {
    const tiny = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const parsed = parseVisitorAds(
      JSON.stringify([
        {
          id: "visitor-atelier",
          name: "Atelier photo",
          tagline: "Publicité sur cet appareil.",
          imageDataUrl: tiny,
          bytes: 12,
        },
      ]),
    );
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.name, "Atelier photo");
    const extra = parsed.map(visitorAdToCreative);
    const merged = listPartnerCreatives(PLACEHOLDER_PARTNERS, extra);
    assert.equal(merged[0]?.id, "visitor-atelier");
    assert.ok(partnerCreativeImageUrl(merged[0]!)?.startsWith("data:image/jpeg"));
    assert.match(partnerCreativeDownloadName(merged[0]!), /publicite-visitor-atelier\.jpg/);
    const huge = `data:image/jpeg;base64,${"A".repeat(AD_IMAGE_MAX_BYTES * 2)}`;
    assert.equal(parseVisitorAds(JSON.stringify([{ id: "x", name: "Big", imageDataUrl: huge }])).length, 0);
    assert.equal(
      parseVisitorAds(
        JSON.stringify([{ id: "x", name: "Script", imageDataUrl: "data:text/html;base64,PHNjcmlwdD4=" }]),
      ).length,
      0,
    );
  });
});

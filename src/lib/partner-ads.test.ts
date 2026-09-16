import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
  partnerCreativeImageUrl,
  placePartnerSlots,
  PLACEHOLDER_PARTNERS,
  usesAdsense,
  visiblePartnerSlots,
} from "./partner-ads.ts";

describe("partner ad config", () => {
  it("defaults to labeled placeholder inventory", () => {
    assert.equal(parseAdsEnabled(undefined), true);
    assert.equal(parseAdProvider(undefined), "placeholder");
    assert.equal(adsEnabled({}), true);
    assert.deepEqual(visiblePartnerSlots({}), ["news-top", "news-mid", "news-bottom"]);
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
    assert.equal(adsenseSlotId("news-top", { top: "zzz", mid: "aaa", bottom: "bbb" }), "zzz");
  });

  it("placeholder copy is Commandité inventory, not a fake headline", () => {
    assert.match(fr.neighborhoodNews.partnerSlot, /Espace partenaire/);
    assert.match(fr.neighborhoodNews.partnerSponsored, /Commandité/);
    assert.doesNotMatch(fr.neighborhoodNews.partnerPlaceholder, /Chargement des nouvelles/);
    assert.match(fr.neighborhoodNews.partnerPlaceholder, /fausse manchette/);
    assert.match(fr.neighborhoodNews.partnerFunding, /pas de revenus pubs en direct/);
    assert.equal(en.neighborhoodNews.partnerSponsored, "Sponsored");
    assert.equal(es.neighborhoodNews.partnerSponsored, "Patrocinado");
  });

  it("exposes rotating soft-launch creatives with name + image + url", () => {
    const list = listPartnerCreatives();
    assert.equal(list.length, PLACEHOLDER_PARTNERS.length);
    assert.ok(list.length >= 2);
    for (const creative of list) {
      assert.ok(creative.id);
      assert.ok(creative.name.includes("exemple") || /exemple/i.test(creative.name));
      assert.ok(creative.href);
      assert.ok(creative.tagline);
      assert.ok(partnerCreativeImageUrl(creative)?.includes("/partners/"));
      assert.doesNotMatch(creative.name, /Chargement des nouvelles/);
    }
  });

  it("rotates creatives per slot from a shared cursor", () => {
    assert.equal(parseRotationIndex("2", 3), 2);
    assert.equal(parseRotationIndex("9", 3), 0);
    assert.equal(parseRotationIndex("nope", 3), 0);
    assert.equal(nextRotationIndex(2, 3), 0);
    const mid0 = creativeForSlot("news-mid", 0);
    const bottom0 = creativeForSlot("news-bottom", 0);
    const top0 = creativeForSlot("news-top", 0);
    assert.notEqual(mid0.id, bottom0.id);
    assert.notEqual(mid0.id, top0.id);
    assert.notEqual(bottom0.id, top0.id);
    assert.equal(creativeForSlot("news-mid", 1).id, bottom0.id);
  });

  it("places Commandité slots above, between, and below headlines", () => {
    const withNews = placePartnerSlots(["news-top", "news-mid", "news-bottom"], true);
    assert.deepEqual(withNews.leading, ["news-top"]);
    assert.deepEqual(withNews.inline, ["news-mid"]);
    assert.deepEqual(withNews.trailing, ["news-bottom"]);
    const empty = placePartnerSlots(["news-top", "news-mid", "news-bottom"], false);
    assert.deepEqual(empty.leading, ["news-top"]);
    assert.deepEqual(empty.inline, []);
    assert.deepEqual(empty.trailing, ["news-mid", "news-bottom"]);
    assert.deepEqual(placePartnerSlots([], true), { leading: [], inline: [], trailing: [] });
  });
});

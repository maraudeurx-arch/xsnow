import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fr } from "./i18n/fr.ts";
import {
  adsEnabled,
  adProvider,
  adsenseSlotId,
  parseAdProvider,
  parseAdsEnabled,
  usesAdsense,
  visiblePartnerSlots,
} from "./partner-ads.ts";

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

  it("placeholder copy is sponsored inventory, not a fake headline", () => {
    assert.match(fr.neighborhoodNews.partnerSlot, /Espace partenaire/);
    assert.match(fr.neighborhoodNews.partnerSponsored, /Commandité/);
    assert.doesNotMatch(fr.neighborhoodNews.partnerPlaceholder, /Chargement des nouvelles/);
    assert.match(fr.neighborhoodNews.partnerPlaceholder, /fausse manchette/);
  });
});

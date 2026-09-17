import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APARTMENT_AVAILABLE_ON,
  APARTMENT_CITY,
  APARTMENT_RENT_CAD,
  communityAdById,
  communityAdImageUrl,
  formatApartmentSummary,
  listCommunityAds,
  nextAdIndex,
  prevAdIndex,
  SEED_COMMUNITY_ADS,
} from "./community-ads.ts";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../../public");

describe("seeded community ads reel", () => {
  it("ships Bogo photo, daycare flyer, and Gatineau apartment summary", () => {
    const ads = listCommunityAds();
    assert.equal(ads.length, 3);
    assert.deepEqual(
      ads.map((ad) => ad.id),
      ["bogo-cat", "daycare-flyer", "apartment-gatineau"],
    );
    const bogo = communityAdById("bogo-cat")!;
    assert.equal(bogo.kind, "photo");
    assert.equal(bogo.downloadable, true);
    assert.ok(communityAdImageUrl(bogo).endsWith("/ads/bogo-cat.png"));
    assert.equal(existsSync(join(publicDir, "ads/bogo-cat.png")), true);

    const daycare = communityAdById("daycare-flyer")!;
    assert.equal(daycare.kind, "flyer");
    const flyer = readFileSync(join(publicDir, "ads/garderie-quartier.svg"), "utf8");
    assert.match(flyer, /Place en garderie/);
    assert.doesNotMatch(flyer, /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/);

    const room = communityAdById("apartment-gatineau")!;
    assert.equal(room.kind, "summary");
    const summary = formatApartmentSummary(room);
    assert.equal(summary.rentCad, APARTMENT_RENT_CAD);
    assert.equal(summary.rentCad, 533);
    assert.equal(summary.availableOn, APARTMENT_AVAILABLE_ON);
    assert.equal(summary.availableOn, "2026-10-01");
    assert.equal(summary.city, APARTMENT_CITY);
    const card = readFileSync(join(publicDir, "ads/chambre-gatineau.svg"), "utf8");
    assert.match(card, /533/);
    assert.match(card, /octobre|oct/i);
    assert.match(card, /Gatineau/);
    assert.doesNotMatch(card, /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/);
    assert.equal(SEED_COMMUNITY_ADS.length, 3);
  });

  it("wraps the reel index", () => {
    assert.equal(nextAdIndex(2, 3), 0);
    assert.equal(prevAdIndex(0, 3), 2);
  });
});

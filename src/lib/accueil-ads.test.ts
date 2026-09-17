import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCUEIL_ADS,
  ACCUEIL_ADS_REEL_MS,
  listAccueilAds,
  nextAccueilAdIndex,
} from "./accueil-ads.ts";

describe("accueil-ads", () => {
  it("rotates every 5 seconds", () => {
    assert.equal(ACCUEIL_ADS_REEL_MS, 5_000);
  });

  it("includes neighbourhood examples and OPC promos", () => {
    assert.deepEqual(
      listAccueilAds().map((ad) => ad.id),
      [
        "bogo-cat",
        "garderie-zozo",
        "appart-chambre",
        "opc-competences",
        "opc-commerce",
      ],
    );
  });

  it("cycles the index", () => {
    assert.equal(nextAccueilAdIndex(0, ACCUEIL_ADS.length), 1);
    assert.equal(nextAccueilAdIndex(ACCUEIL_ADS.length - 1, ACCUEIL_ADS.length), 0);
  });
});

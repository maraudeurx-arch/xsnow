import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCUEIL_ADS,
  ACCUEIL_ADS_REEL_MS,
  nextAccueilAdIndex,
  parseVisitorAccueilAds,
  visitorToAccueilAd,
} from "./accueil-ads.ts";

const TINY_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z";

describe("accueil-ads", () => {
  it("rotates every 5 seconds", () => {
    assert.equal(ACCUEIL_ADS_REEL_MS, 5_000);
  });

  it("includes neighbourhood examples and OPC promos", () => {
    assert.deepEqual(
      ACCUEIL_ADS.map((ad) => ad.id),
      [
        "exemple-coiffeuse",
        "exemple-plombier",
        "exemple-cafe",
        "bogo-cat",
        "garderie-zozo",
        "appart-chambre",
        "opc-competences",
        "opc-commerce",
      ],
    );
    assert.ok(ACCUEIL_ADS.filter((ad) => ad.example).length >= 3);
  });

  it("cycles the index", () => {
    assert.equal(nextAccueilAdIndex(0, ACCUEIL_ADS.length), 1);
    assert.equal(nextAccueilAdIndex(ACCUEIL_ADS.length - 1, ACCUEIL_ADS.length), 0);
  });

  it("accepts a safe visitor photo as an Accueil ad", () => {
    const parsed = parseVisitorAccueilAds(
      JSON.stringify([
        {
          id: "visitor-demo",
          title: "Mon commerce",
          imageDataUrl: TINY_JPEG,
          bytes: 100,
          createdAt: "2026-09-17T00:00:00.000Z",
        },
      ]),
    );
    assert.equal(parsed.length, 1);
    const creative = visitorToAccueilAd(parsed[0]!);
    assert.equal(creative.id, "visitor-demo");
    assert.match(creative.imageDataUrl || "", /^data:image\/jpeg/);
    assert.equal(creative.href, "/business");
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(join(srcDir, rel), "utf8");
}

describe("Accueil ads-only full-bleed layout", () => {
  it("gives the news card entirely to AccueilAdsReel", () => {
    const guide = read("components/Guide.tsx");
    const news = read("components/NeighborhoodNews.tsx");
    const reel = read("components/AccueilAdsReel.tsx");
    const adsLib = read("lib/accueil-ads.ts");

    assert.match(guide, /NeighborhoodNews/);
    assert.match(news, /data-news-ads-only/);
    assert.match(news, /<AccueilAdsReel \/>/);
    assert.doesNotMatch(news, /data-news-list/);
    assert.doesNotMatch(news, /PartnerAdSlot/);
    assert.match(reel, /data-accueil-ads-reel/);
    assert.match(adsLib, /ACCUEIL_ADS_REEL_MS = 5_000/);
    assert.match(adsLib, /bogo-cat/);
    assert.match(adsLib, /opc-competences/);
  });

  it("keeps chat outside the ads flex-grow", () => {
    const guide = read("components/Guide.tsx");
    const chat = read("components/AvatarChat.tsx");
    assert.match(guide, /flex shrink-0 flex-col/);
    assert.match(chat, /id="avatar-chat"/);
    assert.match(chat, /shrink-0/);
  });
});

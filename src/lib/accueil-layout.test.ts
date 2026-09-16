import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(srcDir, "app/globals.css"), "utf8");
const footer = readFileSync(join(srcDir, "components/SiteFooter.tsx"), "utf8");
const news = readFileSync(join(srcDir, "components/NeighborhoodNews.tsx"), "utf8");
const ads = readFileSync(join(srcDir, "components/PartnerAdSlot.tsx"), "utf8");

function cssVar(name: string): string[] {
  const matches = [...css.matchAll(new RegExp(`${name}:\\s*([^;]+);`, "g"))];
  assert.ok(matches.length > 0, `missing ${name}`);
  return matches.map((match) => match[1].trim());
}

function remValue(raw: string): number {
  const match = raw.match(/^([0-9.]+)rem$/);
  assert.ok(match, `expected rem token, got ${raw}`);
  return Number(match[1]);
}

describe("Accueil tight stack layout tokens", () => {
  it("pins the home title to content height instead of a leftover banner band", () => {
    assert.match(css, /grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)/);
    assert.doesNotMatch(css, /0\.42fr/);
    assert.doesNotMatch(css, /0\.08fr/);
    assert.doesNotMatch(css, /\.app-stage:has\(#home-guide\)::after/);
    assert.match(css, /justify-content:\s*flex-start;/);
    assert.match(css, /padding-top:\s*var\(--safe-top\);/);
  });

  it("keeps header / Accueil card / footer gaps tight so leftover height is news", () => {
    for (const value of cssVar("--home-block-gap")) {
      assert.ok(remValue(value) <= 0.4, `--home-block-gap ${value} should stay compact`);
    }
    assert.match(css, /gap:\s*var\(--home-block-gap\)/);
    assert.match(css, /\.app-stage:has\(#home-guide\) > \.app-stage-main \{[\s\S]*?margin-top:\s*0;/);
  });

  it("compacts the legal footer and keeps labeled partner slots in the news panel", () => {
    assert.match(footer, /text-\[8px\]/);
    assert.match(footer, /py-0\.5/);
    assert.match(footer, /mt-1 /);
    assert.doesNotMatch(footer, /safe-area-inset-bottom/);
    assert.match(news, /data-neighborhood-news/);
    assert.match(news, /min-h-\[8rem\]/);
    assert.match(news, /visiblePartnerSlots/);
    assert.match(ads, /data-partner-slot/);
    assert.match(ads, /partnerSponsored/);
  });
});

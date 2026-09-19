import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PUBLIC_SITE_URL } from "../../lib/paths.ts";

const promoDir = join(dirname(fileURLToPath(import.meta.url)), "../../../public/promo");

const PAGES = [
  {
    file: "competences.html",
    headline:
      "Avez-vous une compétence qui serait profitable dans votre quartier ? (peintre, chauffeur, mécanicien) Faites-le savoir.",
  },
  {
    file: "commerce.html",
    headline:
      "Avez-vous un commerce à faire connaître dans le quartier ? (garderie, restaurant, tutorat sur Zoom) Faites-le savoir.",
  },
  {
    file: "index.html",
    headline: "Open Community — Monétisez-vous ! Inscription gratuite.",
  },
] as const;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function headingText(html: string) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  assert.ok(match, "expected an h1");
  return collapseWhitespace(match[1].replace(/<[^>]+>/g, " "));
}

describe("WhatsApp promo landing pages", () => {
  it("ships three clickable custom-domain landings without city names", () => {
    assert.equal(PUBLIC_SITE_URL, "https://opencommunity.app/");

    for (const page of PAGES) {
      const html = readFileSync(join(promoDir, page.file), "utf8");
      assert.match(html, /<html lang="fr">/);
      assert.match(html, /name="viewport"/);
      assert.match(html, /width=device-width/);
      assert.equal(headingText(html), page.headline);
      assert.match(html, /<a class="cta" href="https:\/\/opencommunity\.app\/">Cliquez ici<\/a>/);
      assert.doesNotMatch(html, /Gatineau/i);
    }
  });
});

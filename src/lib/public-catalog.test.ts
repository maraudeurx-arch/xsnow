import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { APP_VERSION } from "./app-version.ts";
import {
  EMPTY_PUBLIC_CATALOG,
  catalogAssetPath,
  catalogAssetUrl,
  loadPublicCatalog,
  parsePublicCatalog,
} from "./public-catalog.ts";
import { FEATURED_CAR_MORNING_ID, offerFromForm, carMorningDefaults, mergeBrowseOffers } from "./offers.ts";
import { SERVICE_SEEDS } from "./services.ts";

describe("public catalog 0.3.0", () => {
  it("ships an empty versioned JSON next to the app", () => {
    const raw = JSON.parse(readFileSync(new URL("../../public/catalog/0.3.0.json", import.meta.url), "utf8"));
    const catalog = parsePublicCatalog(raw);
    assert.equal(APP_VERSION, "0.3.0");
    assert.equal(catalog.version, "0.3.0");
    assert.deepEqual(catalog.offers, []);
    assert.deepEqual(catalog.ideas, []);
    assert.deepEqual(catalog.services, []);
    assert.equal(EMPTY_PUBLIC_CATALOG.offers.length, 0);
    assert.equal(catalogAssetPath(), "/catalog/0.3.0.json");
    assert.equal(catalogAssetUrl(), "/xsnow/catalog/0.3.0.json");
  });

  it("never promotes the legacy featured car id or demo service seeds", () => {
    const poisoned = parsePublicCatalog({
      version: "0.3.0",
      offers: [
        {
          ...offerFromForm({
            ...carMorningDefaults(),
            interacContact: "owner@opc.test",
            insuranceOk: true,
          }),
          id: FEATURED_CAR_MORNING_ID,
          published: true,
          neighborhood: "Gatineau",
        },
      ],
      ideas: [{ id: "idea-1", text: "Secret d’un autre téléphone", involvement: ["mains"] }],
      services: SERVICE_SEEDS.courses,
    });
    assert.equal(poisoned.offers.length, 0);
    assert.equal(poisoned.services.length, 0);
    assert.equal(poisoned.ideas.length, 1);

    const browse = mergeBrowseOffers([], [], null, poisoned.offers);
    assert.equal(browse.length, 0);
  });

  it("falls back to empty when fetch fails", async () => {
    const catalog = await loadPublicCatalog(async () => {
      throw new Error("offline");
    });
    assert.equal(catalog.offers.length, 0);
    assert.equal(catalog.ideas.length, 0);
  });
});

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

describe("public catalog current version", () => {
  it("ships an empty versioned JSON next to the app", () => {
    const raw = JSON.parse(
      readFileSync(new URL(`../../public/catalog/${APP_VERSION}.json`, import.meta.url), "utf8"),
    );
    const catalog = parsePublicCatalog(raw);
    assert.equal(APP_VERSION, "0.3.5");
    assert.equal(catalog.version, APP_VERSION);
    assert.deepEqual(catalog.offers, []);
    assert.deepEqual(catalog.ideas, []);
    assert.deepEqual(catalog.services, []);
    assert.equal(EMPTY_PUBLIC_CATALOG.offers.length, 0);
    assert.equal(catalogAssetPath(), `/catalog/${APP_VERSION}.json`);
    assert.equal(catalogAssetUrl(), `/xsnow/catalog/${APP_VERSION}.json`);
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

  it("drops unpublished offers and keeps only a numbered catalog version", async () => {
    const unpublished = offerFromForm({
      ...carMorningDefaults(),
      interacContact: "draft@opc.test",
      insuranceOk: true,
    });
    unpublished.published = false;
    const catalog = parsePublicCatalog({
      version: "",
      offers: [unpublished],
      ideas: [],
      services: [],
    });
    assert.equal(catalog.version, APP_VERSION);
    assert.equal(catalog.offers.length, 0);

    const http404 = await loadPublicCatalog(async () => ({
      ok: false,
      json: async () => ({ version: "9.9.9", offers: [{ id: FEATURED_CAR_MORNING_ID }] }),
    }));
    assert.equal(http404.offers.length, 0);
    assert.equal(http404.version, APP_VERSION);
  });

  it("loads the shipped JSON through the catalog gate", async () => {
    const catalog = await loadPublicCatalog(async (input) => {
      assert.equal(input, catalogAssetUrl());
      return {
        ok: true,
        json: async () =>
          JSON.parse(readFileSync(new URL(`../../public/catalog/${APP_VERSION}.json`, import.meta.url), "utf8")),
      };
    });
    assert.equal(catalog.version, APP_VERSION);
    assert.equal(catalog.offers.length, 0);
    assert.equal(catalog.ideas.length, 0);
    assert.equal(catalog.services.length, 0);
  });
});

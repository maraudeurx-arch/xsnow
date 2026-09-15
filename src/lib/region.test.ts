import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { placeFromCityName } from "./place-logic.ts";
import {
  ambianceKey,
  DEFAULT_AMBIANCE,
  DEFAULT_AMBIANCE_SEASON,
  parseRegionParam,
  photoForAmbiance,
  REGIONAL_AMBIANCES,
  REGIONAL_PHOTO,
  regionForCountry,
  resolveAmbiance,
  resolveAmbianceFromSearch,
} from "./region.ts";
import { seasonFromDate } from "./season.ts";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../../public");

describe("regionForCountry", () => {
  it("returns null when the country is unknown or empty", () => {
    assert.equal(regionForCountry(""), null);
    assert.equal(regionForCountry("   "), null);
    assert.equal(regionForCountry(null), null);
    assert.equal(regionForCountry("XX"), null);
    assert.equal(regionForCountry("AU"), null);
    assert.equal(regionForCountry("MX"), null);
    assert.equal(regionForCountry("NZ"), null);
  });

  it("keeps Canada and the USA on the four-season calendar", () => {
    assert.equal(regionForCountry("CA"), "seasonal");
    assert.equal(regionForCountry("ca"), "seasonal");
    assert.equal(regionForCountry("US"), "seasonal");
    assert.equal(regionForCountry(" us "), "seasonal");
  });

  it("maps Haiti and the listed Caribbean countries/territories", () => {
    for (const code of ["HT", "JM", "CU", "DO", "PR", "TT", "BB", "BS", "GP", "MQ", "VI"]) {
      assert.equal(regionForCountry(code), "caribbean", code);
    }
  });

  it("does not treat Puerto Rico as US seasons", () => {
    assert.equal(regionForCountry("PR"), "caribbean");
    assert.notEqual(regionForCountry("PR"), "seasonal");
  });

  it("maps African countries to the Sahel default", () => {
    for (const code of ["SN", "ML", "NG", "KE", "ZA", "EG", "MA", "CI", "CD"]) {
      assert.equal(regionForCountry(code), "africa", code);
    }
  });

  it("maps European countries to the meadow ambiance", () => {
    for (const code of ["FR", "DE", "GB", "UK", "ES", "IT", "BE", "CH", "PL", "UA"]) {
      assert.equal(regionForCountry(code), "europe", code);
    }
  });

  it("maps Asian countries to the terraces ambiance", () => {
    for (const code of ["JP", "CN", "IN", "TH", "VN", "KR", "ID", "PH", "SA", "TR"]) {
      assert.equal(regionForCountry(code), "asia", code);
    }
  });

  it("maps South American countries to the Andes ambiance", () => {
    for (const code of ["BR", "PE", "AR", "CL", "CO", "EC", "BO", "UY"]) {
      assert.equal(regionForCountry(code), "southamerica", code);
    }
  });

  it("prefers Caribbean overseas codes over the parent country", () => {
    assert.equal(regionForCountry("GP"), "caribbean");
    assert.equal(regionForCountry("FR"), "europe");
  });
});

describe("parseRegionParam", () => {
  it("accepts region keys and short aliases", () => {
    assert.equal(parseRegionParam("caribbean"), "caribbean");
    assert.equal(parseRegionParam("SAHEL"), "africa");
    assert.equal(parseRegionParam("andes"), "southamerica");
    assert.equal(parseRegionParam("south-america"), "southamerica");
    assert.equal(parseRegionParam("winter"), null);
    assert.equal(parseRegionParam(""), null);
  });
});

describe("resolveAmbiance", () => {
  it("defaults to North-America autumn before geo is known", () => {
    assert.deepEqual(resolveAmbiance({}), DEFAULT_AMBIANCE);
    assert.deepEqual(resolveAmbiance({ countryCode: "" }), DEFAULT_AMBIANCE);
    assert.equal(DEFAULT_AMBIANCE_SEASON, "autumn");
  });

  it("keeps autumn when geo was attempted but the country is still unknown", () => {
    assert.deepEqual(resolveAmbiance({ countryCode: "" }), DEFAULT_AMBIANCE);
    assert.deepEqual(resolveAmbiance({ countryCode: "AU" }), DEFAULT_AMBIANCE);
  });

  it("uses the calendar season for CA/US by date, not a static regional photo", () => {
    const winter = new Date("2026-01-15T12:00:00Z");
    const spring = new Date("2026-04-15T12:00:00Z");
    const summer = new Date("2026-07-15T12:00:00Z");
    const autumn = new Date("2026-10-15T12:00:00Z");
    assert.deepEqual(resolveAmbiance({ countryCode: "CA", now: winter }), {
      type: "season",
      season: "winter",
    });
    assert.deepEqual(resolveAmbiance({ countryCode: "US", now: spring }), {
      type: "season",
      season: "spring",
    });
    assert.deepEqual(resolveAmbiance({ countryCode: "CA", now: summer }), {
      type: "season",
      season: "summer",
    });
    assert.deepEqual(resolveAmbiance({ countryCode: "US", now: autumn }), {
      type: "season",
      season: "autumn",
    });
    assert.equal(
      resolveAmbiance({ countryCode: "CA", now: winter }).type === "season"
        ? resolveAmbiance({ countryCode: "CA", now: winter }).type
        : "",
      "season",
    );
    assert.equal(seasonFromDate(winter), "winter");
  });

  it("switches Haiti to the Caribbean image, not Gatineau autumn", () => {
    assert.deepEqual(resolveAmbiance({ countryCode: "HT" }), {
      type: "region",
      region: "caribbean",
    });
    const pap = placeFromCityName("Port-au-Prince");
    assert.equal(pap.countryCode, "HT");
    assert.deepEqual(resolveAmbiance({ countryCode: pap.countryCode }), {
      type: "region",
      region: "caribbean",
    });
  });

  it("matches Europe, Asia, South America, and Africa ambiances", () => {
    assert.deepEqual(resolveAmbiance({ countryCode: "FR" }), { type: "region", region: "europe" });
    assert.deepEqual(resolveAmbiance({ countryCode: "JP" }), { type: "region", region: "asia" });
    assert.deepEqual(resolveAmbiance({ countryCode: "BR" }), {
      type: "region",
      region: "southamerica",
    });
    assert.deepEqual(resolveAmbiance({ countryCode: "SN" }), { type: "region", region: "africa" });
  });

  it("lets ?season= win for QA even when a country is known", () => {
    assert.deepEqual(
      resolveAmbiance({ countryCode: "HT", seasonOverride: "winter" }),
      { type: "season", season: "winter" },
    );
    assert.deepEqual(resolveAmbianceFromSearch("?season=summer&city=Paris", "FR"), {
      type: "season",
      season: "summer",
    });
  });

  it("lets ?region= force a static ambiance", () => {
    assert.deepEqual(resolveAmbianceFromSearch("?region=caribbean", ""), {
      type: "region",
      region: "caribbean",
    });
    assert.equal(parseRegionParam("europe"), "europe");
  });
});

describe("backdrop photo assets", () => {
  it("ships owner-approved JPEGs for regional and CA/US seasonal ambiances", () => {
    for (const region of REGIONAL_AMBIANCES) {
      const photo = REGIONAL_PHOTO[region];
      assert.ok(photo.jpeg.startsWith("/backgrounds/"));
      assert.match(photo.jpeg, /\.jpg$/);
      assert.equal(existsSync(join(publicDir, photo.jpeg)), true, photo.jpeg);
      const resolved = photoForAmbiance({ type: "region", region });
      assert.equal(resolved.jpeg, photo.jpeg);
    }
    const autumn = photoForAmbiance(DEFAULT_AMBIANCE);
    assert.equal(autumn.jpeg, "/backgrounds/na-autumn.jpg");
    assert.equal(existsSync(join(publicDir, autumn.jpeg)), true);
    for (const season of ["winter", "spring", "summer"] as const) {
      const photo = photoForAmbiance({ type: "season", season });
      assert.equal(photo.jpeg, `/backgrounds/na-${season}.jpg`);
      assert.equal(existsSync(join(publicDir, photo.jpeg)), true, photo.jpeg);
    }
    assert.equal(ambianceKey(DEFAULT_AMBIANCE), "season:autumn");
  });
});

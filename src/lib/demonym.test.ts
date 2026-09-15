import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  demonymFor,
  demonymPairFor,
  displayCity,
  placeName,
} from "./demonym.ts";

describe("demonymFor", () => {
  it("uses known French gentilés", () => {
    assert.equal(demonymFor("Gatineau"), "Gatinois");
    assert.equal(demonymFor("Montréal"), "Montréalais");
    assert.equal(demonymFor("Montreal"), "Montréalais");
    assert.equal(demonymFor("New York"), "New-Yorkais");
    assert.equal(demonymFor("Paris"), "Parisiens");
  });

  it("falls back to habitants de {city}", () => {
    assert.equal(demonymFor("Springfield"), "habitants de Springfield");
  });

  it("uses English and Spanish forms", () => {
    assert.equal(demonymFor("New York", "en"), "New Yorkers");
    assert.equal(demonymFor("Gatineau", "en"), "Gatineau residents");
    assert.equal(demonymFor("New York", "es"), "los neoyorquinos");
    assert.equal(demonymFor("Gatineau", "es"), "los gatineses");
  });

  it("hyphenates New- compounds", () => {
    assert.equal(demonymFor("New Haven"), "New-Havenais");
  });
});

describe("demonymPairFor", () => {
  it("shows both genders for New York", () => {
    assert.equal(demonymPairFor("New York"), "New-Yorkais / New-Yorkaise");
  });
});

describe("place display", () => {
  it("uppercases the wordmark", () => {
    assert.equal(placeName("Gatineau"), "GATINEAU");
    assert.equal(placeName("New York"), "NEW YORK");
    assert.equal(placeName("Montréal"), "MONTRÉAL");
  });

  it("restores known accents", () => {
    assert.equal(displayCity("montreal"), "Montréal");
  });
});

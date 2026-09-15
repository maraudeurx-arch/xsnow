import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isInjectedSeedId } from "./offers.ts";
import {
  formatMoney,
  isServiceKind,
  SERVICE_KINDS,
  SERVICE_SEEDS,
  SERVICES,
} from "./services.ts";

describe("service kinds", () => {
  it("accepts the four soft-launch kinds only", () => {
    assert.deepEqual([...SERVICE_KINDS], ["courses", "demenagement", "garde", "pret"]);
    assert.equal(isServiceKind("courses"), true);
    assert.equal(isServiceKind("car_morning"), false);
    assert.equal(isServiceKind("seed-courses-1"), false);
  });

  it("keeps example seeds labeled so they cannot auto-list", () => {
    for (const kind of SERVICE_KINDS) {
      assert.equal(SERVICES[kind].kind, kind);
      assert.ok(SERVICES[kind].storageKey.startsWith("xsnow.services."));
      for (const listing of SERVICE_SEEDS[kind]) {
        assert.equal(listing.service, kind);
        assert.equal(isInjectedSeedId(listing.id), true);
        assert.match(listing.id, /^seed-/);
      }
    }
  });

  it("formats CAD without throwing", () => {
    assert.match(formatMoney(15, "CAD", "fr-CA"), /15/);
    assert.equal(formatMoney(12, "NOT-A-CURRENCY"), "12 NOT-A-CURRENCY");
  });
});

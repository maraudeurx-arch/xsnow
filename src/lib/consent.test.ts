import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANALYTICS_CONSENT_KEY,
  analyticsAllowed,
  isAnalyticsConsent,
  readAnalyticsConsent,
  resetAnalyticsConsentCache,
  writeAnalyticsConsent,
} from "./consent.ts";

function memoryStore() {
  const mem = new Map<string, string>();
  return {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
    clear: () => mem.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

describe("analytics consent storage", () => {
  it("starts unset and only allows posts after grant", () => {
    resetAnalyticsConsentCache();
    const store = memoryStore();
    assert.equal(readAnalyticsConsent(store), "unset");
    assert.equal(analyticsAllowed(store), false);
    writeAnalyticsConsent("denied", store);
    assert.equal(readAnalyticsConsent(store), "denied");
    assert.equal(analyticsAllowed(store), false);
    writeAnalyticsConsent("granted", store);
    assert.equal(readAnalyticsConsent(store), "granted");
    assert.equal(analyticsAllowed(store), true);
    assert.equal(JSON.parse(store.getItem(ANALYTICS_CONSENT_KEY) ?? "null"), "granted");
  });

  it("rejects junk values", () => {
    assert.equal(isAnalyticsConsent("granted"), true);
    assert.equal(isAnalyticsConsent("skipped"), false);
    const store = memoryStore();
    store.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify("maybe"));
    assert.equal(readAnalyticsConsent(store), "unset");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WELCOME_GATE_KEY,
  beginWelcomeIntent,
  isWelcomeInFlight,
  openWelcomeGate,
  readWelcomeGate,
  resetWelcomeGateCache,
} from "./welcome-gate.ts";

function memorySession() {
  const data: Record<string, string> = {};
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = String(value);
    },
    removeItem(key: string) {
      delete data[key];
    },
    clear() {
      for (const k of Object.keys(data)) delete data[k];
    },
    key() {
      return null;
    },
    get length() {
      return Object.keys(data).length;
    },
  } as Storage;
}

describe("welcome gate session flag", () => {
  it("starts closed, tracks in-flight speech, then opens once", () => {
    const previous = (globalThis as { window?: unknown }).window;
    const sessionStorage = memorySession();
    (globalThis as { window: { sessionStorage: Storage } }).window = { sessionStorage };
    resetWelcomeGateCache();
    try {
      assert.equal(readWelcomeGate(), false);
      assert.equal(isWelcomeInFlight(), false);
      beginWelcomeIntent();
      assert.equal(isWelcomeInFlight(), true);
      assert.equal(readWelcomeGate(), false);
      openWelcomeGate();
      assert.equal(isWelcomeInFlight(), false);
      assert.equal(readWelcomeGate(), true);
      assert.equal(sessionStorage.getItem(WELCOME_GATE_KEY), "open");
      resetWelcomeGateCache();
      assert.equal(readWelcomeGate(), true);
    } finally {
      resetWelcomeGateCache();
      if (previous === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = previous;
      }
    }
  });
});

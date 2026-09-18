import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GUIDE_CONTROLS_STARTED_KEY,
  GUIDE_CONTROLS_VISIBLE_MS,
  ensureGuideControlsStarted,
  readGuideControlsStartedAt,
  refreshGuideControlsStarted,
  shouldShowGuideControls,
} from "./guide-controls.ts";

function memStore(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

describe("guide controls visibility window", () => {
  it("starts a one-hour window and hides after it elapses", () => {
    const store = memStore();
    const t0 = 1_000_000;
    assert.equal(readGuideControlsStartedAt(store), null);
    assert.equal(shouldShowGuideControls(t0, store), true);
    assert.equal(ensureGuideControlsStarted(t0, store), t0);
    assert.equal(store.getItem(GUIDE_CONTROLS_STARTED_KEY), String(t0));
    assert.equal(shouldShowGuideControls(t0 + GUIDE_CONTROLS_VISIBLE_MS - 1, store), true);
    assert.equal(shouldShowGuideControls(t0 + GUIDE_CONTROLS_VISIBLE_MS, store), false);
  });

  it("restarts the hour when the avatar is changed", () => {
    const store = memStore();
    const t0 = 5_000_000;
    ensureGuideControlsStarted(t0, store);
    assert.equal(shouldShowGuideControls(t0 + GUIDE_CONTROLS_VISIBLE_MS + 10, store), false);
    const t1 = t0 + GUIDE_CONTROLS_VISIBLE_MS + 60_000;
    refreshGuideControlsStarted(t1, store);
    assert.equal(shouldShowGuideControls(t1 + 1_000, store), true);
    assert.equal(shouldShowGuideControls(t1 + GUIDE_CONTROLS_VISIBLE_MS, store), false);
  });
});

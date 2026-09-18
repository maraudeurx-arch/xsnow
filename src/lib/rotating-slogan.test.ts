import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SLOGAN_INDEX_KEY,
  SLOGAN_SESSION_KEY,
  pickSloganForSession,
} from "./rotating-slogan.ts";

function memoryStore(seed: Record<string, string> = {}): Storage {
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

const slogans = ["A.", "B.", "C."] as const;

describe("pickSloganForSession", () => {
  it("advances on each new session and stays stable within one", () => {
    const local = memoryStore();
    const session1 = memoryStore();
    assert.equal(pickSloganForSession(slogans, { local, session: session1 }), "A.");
    assert.equal(pickSloganForSession(slogans, { local, session: session1 }), "A.");
    assert.equal(local.getItem(SLOGAN_INDEX_KEY), "1");
    assert.equal(session1.getItem(SLOGAN_SESSION_KEY), "0");

    const session2 = memoryStore();
    assert.equal(pickSloganForSession(slogans, { local, session: session2 }), "B.");
    assert.equal(local.getItem(SLOGAN_INDEX_KEY), "2");

    const session3 = memoryStore();
    assert.equal(pickSloganForSession(slogans, { local, session: session3 }), "C.");
    const session4 = memoryStore();
    assert.equal(pickSloganForSession(slogans, { local, session: session4 }), "A.");
  });
});

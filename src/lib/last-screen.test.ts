import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LAST_SCREEN_KEY,
  LAST_SCREEN_TTL_MS,
  isResumableScreen,
  normalizeScreenPath,
  rememberScreen,
  resumeTarget,
  type ResumeContext,
} from "./last-screen.ts";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

const NOW = 1_800_000_000_000;
const launch = (over: Partial<ResumeContext> = {}): ResumeContext => ({
  pathname: "/",
  search: "",
  hash: "",
  standalone: true,
  hasAvatar: true,
  now: NOW,
  ...over,
});

describe("last screen resume", () => {
  it("normalizes paths and keeps only app screens", () => {
    assert.equal(normalizeScreenPath("/vos-idees/"), "/vos-idees");
    assert.equal(normalizeScreenPath("/gagner-maintenant/?x=1#y"), "/gagner-maintenant");
    assert.equal(normalizeScreenPath(""), "/");
    assert.equal(normalizeScreenPath("/../etc"), null);
    assert.equal(normalizeScreenPath("//evil.example"), null);
    assert.equal(isResumableScreen("/mon-profil/inviter/"), true);
    assert.equal(isResumableScreen("/services/garderie/"), true);
    assert.equal(isResumableScreen("/proprietaire/idees/"), false);
    assert.equal(isResumableScreen("/vie-privee/"), false);
    assert.equal(isResumableScreen("/"), false);
  });

  it("stores the path only, never query or hash", () => {
    const storage = memoryStorage();
    rememberScreen(storage, "/alertes/?invite=secret#x", NOW);
    assert.deepEqual(JSON.parse(storage.getItem(LAST_SCREEN_KEY) ?? ""), { path: "/alertes", at: NOW });
    assert.doesNotMatch(storage.getItem(LAST_SCREEN_KEY) ?? "", /secret/);
  });

  it("Accueil and non-resumable pages clear the memory", () => {
    const storage = memoryStorage();
    rememberScreen(storage, "/vos-idees/", NOW);
    rememberScreen(storage, "/", NOW);
    assert.equal(storage.getItem(LAST_SCREEN_KEY), null);
    rememberScreen(storage, "/vos-idees/", NOW);
    rememberScreen(storage, "/proprietaire/idees/", NOW);
    assert.equal(storage.getItem(LAST_SCREEN_KEY), null);
  });

  it("resumes the last screen on a bare Home Screen launch within 24 h", () => {
    const storage = memoryStorage();
    rememberScreen(storage, "/gagner-maintenant/", NOW - 60_000);
    assert.equal(resumeTarget(storage, launch()), "/gagner-maintenant/");
    rememberScreen(storage, "/vos-idees/", NOW - LAST_SCREEN_TTL_MS);
    assert.equal(resumeTarget(storage, launch()), "/vos-idees/");
  });

  it("stays on Accueil for new visitors, plain browser tabs, explicit links or other pages", () => {
    const storage = memoryStorage();
    rememberScreen(storage, "/mon-profil/", NOW);
    assert.equal(resumeTarget(storage, launch({ hasAvatar: false })), null);
    assert.equal(resumeTarget(storage, launch({ standalone: false })), null);
    assert.equal(resumeTarget(storage, launch({ search: "?lang=en" })), null);
    assert.equal(resumeTarget(storage, launch({ hash: "#top" })), null);
    assert.equal(resumeTarget(storage, launch({ pathname: "/vos-idees/" })), null);
    // Still kept for the next real launch.
    assert.notEqual(storage.getItem(LAST_SCREEN_KEY), null);
  });

  it("expires after 24 h and drops invalid data (fallback Accueil)", () => {
    const storage = memoryStorage();
    rememberScreen(storage, "/vos-idees/", NOW - LAST_SCREEN_TTL_MS - 1);
    assert.equal(resumeTarget(storage, launch()), null);
    assert.equal(storage.getItem(LAST_SCREEN_KEY), null);

    for (const raw of [
      "{oops",
      "null",
      JSON.stringify({ path: "/proprietaire/idees", at: NOW }),
      JSON.stringify({ path: "https://evil.example/", at: NOW }),
      JSON.stringify({ path: "/vos-idees", at: "hier" }),
      JSON.stringify({ path: "/vos-idees", at: NOW + 60_000 }),
    ]) {
      storage.setItem(LAST_SCREEN_KEY, raw);
      assert.equal(resumeTarget(storage, launch()), null, raw);
      assert.equal(storage.getItem(LAST_SCREEN_KEY), null, raw);
    }
  });
});

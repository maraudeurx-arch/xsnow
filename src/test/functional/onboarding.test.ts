import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "../../lib/i18n/en.ts";
import { es } from "../../lib/i18n/es.ts";
import { fr } from "../../lib/i18n/fr.ts";
import { isPublicInfoPath, TRUST_NAV } from "../../lib/paths.ts";
import {
  WELCOME_GATE_KEY,
  beginWelcomeIntent,
  isWelcomeInFlight,
  openWelcomeGate,
  readWelcomeGate,
  resetWelcomeGateCache,
} from "../../lib/welcome-gate.ts";
import {
  WELCOME_AUTOPLAY_GRACE_MS,
  canShowConsentSheet,
  welcomeGateShouldOpen,
  welcomeSpeechReady,
} from "../../lib/welcome-place.ts";

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
      for (const key of Object.keys(data)) delete data[key];
    },
    key() {
      return null;
    },
    get length() {
      return Object.keys(data).length;
    },
  } as Storage;
}

describe("first-visit onboarding order", () => {
  it("never offers geo before avatar + welcome, then does", () => {
    assert.equal(welcomeSpeechReady({ hasAvatar: false }), false);
    assert.equal(canShowConsentSheet({ hasAvatar: false, welcomeGateOpen: false }), false);

    assert.equal(welcomeSpeechReady({ hasAvatar: true }), true);
    assert.equal(canShowConsentSheet({ hasAvatar: true, welcomeGateOpen: false }), false);

    assert.equal(
      welcomeGateShouldOpen({
        engineStarted: true,
        engineEnded: false,
        msSinceSpeakIntent: 20_000,
      }),
      false,
    );
    assert.equal(
      welcomeGateShouldOpen({
        engineStarted: true,
        engineEnded: true,
        msSinceSpeakIntent: 4_000,
      }),
      true,
    );
    assert.equal(canShowConsentSheet({ hasAvatar: true, welcomeGateOpen: true }), true);
  });

  it("opens geo only after the welcome gate session flag, in avatar → speech → geo order", () => {
    const previous = (globalThis as { window?: unknown }).window;
    const sessionStorage = memorySession();
    (globalThis as { window: { sessionStorage: Storage } }).window = { sessionStorage };
    resetWelcomeGateCache();
    try {
      assert.equal(welcomeSpeechReady({ hasAvatar: false }), false);
      assert.equal(readWelcomeGate(), false);
      assert.equal(
        canShowConsentSheet({ hasAvatar: false, welcomeGateOpen: readWelcomeGate() }),
        false,
      );

      assert.equal(welcomeSpeechReady({ hasAvatar: true }), true);
      beginWelcomeIntent();
      assert.equal(isWelcomeInFlight(), true);
      assert.equal(readWelcomeGate(), false);
      assert.equal(
        canShowConsentSheet({ hasAvatar: true, welcomeGateOpen: readWelcomeGate() }),
        false,
      );

      assert.equal(
        welcomeGateShouldOpen({
          engineStarted: false,
          engineEnded: false,
          msSinceSpeakIntent: WELCOME_AUTOPLAY_GRACE_MS - 1,
        }),
        false,
      );
      assert.equal(
        welcomeGateShouldOpen({
          engineStarted: false,
          engineEnded: false,
          msSinceSpeakIntent: WELCOME_AUTOPLAY_GRACE_MS,
        }),
        true,
      );

      openWelcomeGate();
      assert.equal(isWelcomeInFlight(), false);
      assert.equal(sessionStorage.getItem(WELCOME_GATE_KEY), "open");
      assert.equal(
        canShowConsentSheet({ hasAvatar: true, welcomeGateOpen: readWelcomeGate() }),
        true,
      );
    } finally {
      resetWelcomeGateCache();
      if (previous === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = previous;
      }
    }
  });

  it("keeps trust pages readable without waiting for avatar or geo", () => {
    for (const item of TRUST_NAV) {
      assert.equal(isPublicInfoPath(item.href), true, item.href);
    }
    assert.equal(isPublicInfoPath("/mon-profil/a-propos"), true);
    assert.equal(isPublicInfoPath("/proprietaire/idees"), true);
    assert.equal(isPublicInfoPath("/"), false);
    assert.equal(
      canShowConsentSheet({ hasAvatar: true, welcomeGateOpen: true }),
      true,
    );
  });

  it("keeps the spoken welcome city-free in FR/EN/ES", () => {
    for (const welcome of [fr.welcome, en.welcome, es.welcome]) {
      assert.doesNotMatch(welcome, /\{city\}/);
      assert.doesNotMatch(welcome, /Gatineau/);
    }
    assert.match(fr.welcome, /je suis ton avatar/);
    assert.match(fr.welcome, /gens d’ici/);
    assert.match(fr.welcome, /Vos idées/);
    assert.match(en.welcome, /I’m your avatar/);
    assert.match(en.welcome, /people here/);
    assert.match(en.welcome, /Your ideas/);
    assert.match(es.welcome, /soy tu avatar/);
    assert.match(es.welcome, /gente de aquí/);
    assert.match(es.welcome, /Tus ideas/);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WELCOME_AUTOPLAY_GRACE_MS,
  canShowConsentSheet,
  welcomeGateShouldOpen,
  welcomeSpeechReady,
} from "./welcome-place.ts";

describe("welcome speech vs geolocation order", () => {
  it("plays welcome as soon as an avatar is chosen, without waiting for GPS", () => {
    assert.equal(welcomeSpeechReady({ hasAvatar: false }), false);
    assert.equal(welcomeSpeechReady({ hasAvatar: true }), true);
  });

  it("opens the geo sheet only after avatar + welcome gate", () => {
    assert.equal(canShowConsentSheet({ hasAvatar: false, welcomeGateOpen: false }), false);
    assert.equal(canShowConsentSheet({ hasAvatar: true, welcomeGateOpen: false }), false);
    assert.equal(canShowConsentSheet({ hasAvatar: false, welcomeGateOpen: true }), false);
    assert.equal(canShowConsentSheet({ hasAvatar: true, welcomeGateOpen: true }), true);
  });

  it("prefers waiting for speech to end, and falls back if autoplay is blocked", () => {
    assert.equal(
      welcomeGateShouldOpen({
        engineStarted: false,
        engineEnded: false,
        msSinceSpeakIntent: 200,
      }),
      false,
    );
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
        msSinceSpeakIntent: 20_000,
      }),
      true,
    );
    assert.equal(
      welcomeGateShouldOpen({
        engineStarted: false,
        engineEnded: false,
        msSinceSpeakIntent: WELCOME_AUTOPLAY_GRACE_MS,
      }),
      true,
    );
  });
});

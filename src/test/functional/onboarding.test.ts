import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "../../lib/i18n/en.ts";
import { es } from "../../lib/i18n/es.ts";
import { fr } from "../../lib/i18n/fr.ts";
import {
  canShowConsentSheet,
  welcomeGateShouldOpen,
  welcomeSpeechReady,
} from "../../lib/welcome-place.ts";

describe("first-visit onboarding order", () => {
  it("never offers geo before avatar + welcome, then does", () => {
    assert.equal(welcomeSpeechReady({ hasAvatar: false }), false);
    assert.equal(canShowConsentSheet({ hasAvatar: false, welcomeGateOpen: false }), false);

    assert.equal(welcomeSpeechReady({ hasAvatar: true }), true);
    assert.equal(canShowConsentSheet({ hasAvatar: true, welcomeGateOpen: false }), false);

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

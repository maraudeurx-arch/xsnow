import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inAppBrowser, installPlatform, isStandaloneDisplay, shouldShowInstallWall, INSTALL_WALL_ENABLED } from "./install-wall.ts";
import { fr } from "./i18n/fr.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

describe("mur d'installation OPC (Popol, 09/11/2026)", () => {
  it("is ON and blocks every non-installed context", () => {
    assert.equal(INSTALL_WALL_ENABLED, true);
    assert.equal(shouldShowInstallWall({ standalone: false, pathname: "/" }), true);
    assert.equal(shouldShowInstallWall({ standalone: false, pathname: "/monetise/" }), true);
  });

  it("opens only when the app runs installed (standalone)", () => {
    assert.equal(shouldShowInstallWall({ standalone: true, pathname: "/" }), false);
    assert.equal(isStandaloneDisplay({ navigatorStandalone: true }), true);
    assert.equal(isStandaloneDisplay({ displayModeStandalone: true }), true);
    assert.equal(isStandaloneDisplay({ navigatorStandalone: false, displayModeStandalone: false }), false);
  });

  it("keeps terms and privacy readable before install", () => {
    assert.equal(shouldShowInstallWall({ standalone: false, pathname: "/conditions/" }), false);
    assert.equal(shouldShowInstallWall({ standalone: false, pathname: "/vie-privee" }), false);
  });

  it("detects iPhone, Android and in-app browsers", () => {
    assert.equal(installPlatform(IPHONE), "ios");
    assert.equal(installPlatform(ANDROID), "android");
    assert.equal(installPlatform("Mozilla/5.0 (Windows NT 10.0)"), "other");
    assert.equal(inAppBrowser(`${IPHONE} [FBAN/FBIOS;FBAV/450.0]`), true);
    assert.equal(inAppBrowser(IPHONE), false);
  });

  it("has iPhone and Android guides plus a video placeholder in FR, EN and ES", () => {
    for (const t of [fr.installWall, en.installWall, es.installWall]) {
      assert.equal(t.iosSteps.length, 3);
      assert.equal(t.androidSteps.length, 3);
      assert.ok(t.videoPlaceholder.length > 5);
      assert.match(t.title, /OPC/);
    }
  });
});

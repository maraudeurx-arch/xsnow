import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INSTALL_TIP_KEY,
  forceInstallTipFromSearch,
  isAndroidDevice,
  isIosDevice,
  isStandaloneDisplay,
  readInstallTipDismissed,
  shouldShowInstallTip,
  writeInstallTipDismissed,
} from "./install-tip.ts";

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)";

describe("isIosDevice", () => {
  it("detects iPhone and iPadOS-as-Mac", () => {
    assert.equal(isIosDevice({ userAgent: IPHONE }), true);
    assert.equal(isIosDevice({ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" }), true);
    assert.equal(
      isIosDevice({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", platform: "MacIntel", maxTouchPoints: 5 }),
      true,
    );
    assert.equal(
      isIosDevice({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32", maxTouchPoints: 0 }),
      false,
    );
    assert.equal(isIosDevice({ userAgent: ANDROID_CHROME }), false);
  });
});

describe("isAndroidDevice", () => {
  it("detects Android Chrome, not iPhone", () => {
    assert.equal(isAndroidDevice({ userAgent: ANDROID_CHROME }), true);
    assert.equal(isAndroidDevice({ userAgent: IPHONE }), false);
    assert.equal(isAndroidDevice({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }), false);
  });
});

describe("install tip visibility", () => {
  it("reads ?installTip=1 for QA", () => {
    assert.equal(forceInstallTipFromSearch("?installTip=1"), true);
    assert.equal(forceInstallTipFromSearch("lang=fr&installTip=1"), true);
    assert.equal(forceInstallTipFromSearch("?lang=en"), false);
  });

  it("hides after localStorage dismiss, even on iPhone", () => {
    const store = memoryStore();
    assert.equal(
      shouldShowInstallTip({
        userAgent: IPHONE,
        store,
      }),
      true,
    );
    writeInstallTipDismissed(store);
    assert.equal(store.getItem(INSTALL_TIP_KEY), "1");
    assert.equal(readInstallTipDismissed(store), true);
    assert.equal(
      shouldShowInstallTip({
        userAgent: IPHONE,
        store,
      }),
      false,
    );
  });

  it("does not show in standalone even on iPhone", () => {
    assert.equal(
      shouldShowInstallTip({
        userAgent: IPHONE,
        standalone: true,
        store: memoryStore(),
      }),
      false,
    );
    assert.equal(isStandaloneDisplay({ standalone: true }), true);
  });

  it("shows on Android Chrome until dismissed", () => {
    const store = memoryStore();
    assert.equal(shouldShowInstallTip({ userAgent: ANDROID_CHROME, store }), true);
    writeInstallTipDismissed(store);
    assert.equal(shouldShowInstallTip({ userAgent: ANDROID_CHROME, store }), false);
  });

  it("shows via ?installTip=1 on desktop", () => {
    const store = memoryStore();
    assert.equal(
      shouldShowInstallTip({
        userAgent: "Mozilla/5.0 (Windows NT 10.0)",
        search: "?installTip=1",
        store,
      }),
      true,
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INSTALL_TIP_KEY,
  forceInstallTipFromSearch,
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

describe("isIosDevice", () => {
  it("detects iPhone and iPadOS-as-Mac", () => {
    assert.equal(isIosDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }), true);
    assert.equal(isIosDevice({ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" }), true);
    assert.equal(isIosDevice({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", platform: "MacIntel", maxTouchPoints: 5 }), true);
    assert.equal(isIosDevice({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32", maxTouchPoints: 0 }), false);
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
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        store,
      }),
      true,
    );
    writeInstallTipDismissed(store);
    assert.equal(store.getItem(INSTALL_TIP_KEY), "1");
    assert.equal(readInstallTipDismissed(store), true);
    assert.equal(
      shouldShowInstallTip({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        store,
      }),
      false,
    );
  });

  it("does not show in standalone even on iPhone", () => {
    assert.equal(
      shouldShowInstallTip({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        standalone: true,
        store: memoryStore(),
      }),
      false,
    );
    assert.equal(isStandaloneDisplay({ standalone: true }), true);
  });

  it("QA flag still works on desktop until dismissed", () => {
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

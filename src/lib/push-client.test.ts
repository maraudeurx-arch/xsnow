import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { b64uToUint8, isIos, pushSupport } from "./push-client.ts";

const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1";
const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36";
const all = { hasPush: true, hasSw: true, hasNotification: true };

describe("push support", () => {
  it("iPhone in Safari must install to Home Screen first", () => {
    assert.ok(isIos(iphone));
    assert.equal(pushSupport({ ua: iphone, standalone: false, ...all }), "ios-install");
    assert.equal(pushSupport({ ua: iphone, standalone: true, ...all }), "ok");
  });
  it("Android Chrome works directly; missing APIs = unsupported", () => {
    assert.equal(pushSupport({ ua: android, standalone: false, ...all }), "ok");
    assert.equal(pushSupport({ ua: android, standalone: false, ...all, hasPush: false }), "unsupported");
  });
  it("decodes base64url VAPID keys", () => {
    assert.deepEqual([...b64uToUint8("BAEC")], [4, 1, 2]);
  });
});

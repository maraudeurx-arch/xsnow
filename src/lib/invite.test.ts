import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_SHARE_CODE,
  captureInviteFromSearch,
  defaultShareBlurb,
  parseInviteSearch,
  publicInviteUrl,
  readOrCreateShareCode,
  rememberInviteTouch,
  sanitizeInviteCode,
} from "./invite.ts";

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
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

describe("invite query params", () => {
  it("reads invite= and ref=, optional src, and sanitizes", () => {
    assert.deepEqual(parseInviteSearch("?invite=Ami"), { code: "ami", src: "" });
    assert.deepEqual(parseInviteSearch("ref=critique-1&src=Twitter!!"), {
      code: "critique-1",
      src: "twitter",
    });
    assert.equal(parseInviteSearch("?lang=fr"), null);
    assert.equal(sanitizeInviteCode("OPC Ada@x"), "opcadax");
  });

  it("keeps first-touch and does not overwrite later codes", () => {
    const store = memoryStore();
    const first = captureInviteFromSearch("?invite=ami&src=critique", store);
    const second = captureInviteFromSearch("?invite=other", store);
    assert.deepEqual(first, { code: "ami", src: "critique" });
    assert.deepEqual(second, first);
    const remembered = rememberInviteTouch({ code: "later", src: "" }, store);
    assert.equal(remembered.code, "ami");
  });

  it("builds the public share URL and a French paste blurb", () => {
    const url = publicInviteUrl("opc-ab12");
    assert.equal(url, "https://maraudeurx-arch.github.io/xsnow/?invite=opc-ab12");
    assert.equal(
      publicInviteUrl("ami", "critique"),
      "https://maraudeurx-arch.github.io/xsnow/?invite=ami&src=critique",
    );
    assert.match(defaultShareBlurb(url, "fr"), /Rejoins-nous/);
    assert.match(defaultShareBlurb(url, "fr"), /invite=opc-ab12/);
  });

  it("creates a local share code once", () => {
    const store = memoryStore();
    const first = readOrCreateShareCode(store, () => "opc-test");
    const second = readOrCreateShareCode(store, () => "opc-other");
    assert.equal(first, "opc-test");
    assert.equal(second, first);
    assert.notEqual(first, DEFAULT_SHARE_CODE);
  });
});

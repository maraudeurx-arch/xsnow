import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_SHARE_CODE,
  bindShareCodeToMemberId,
  captureInviteFromSearch,
  defaultShareBlurb,
  inviteCodeFromMemberId,
  parseInviteSearch,
  publicInviteUrl,
  readOrCreateShareCode,
  rememberInviteTouch,
  resolveShareCode,
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
    assert.equal(url, "https://opencommunity.app/?invite=opc-ab12");
    assert.equal(
      publicInviteUrl("ami", "critique"),
      "https://opencommunity.app/?invite=ami&src=critique",
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

  it("drops executable junk and empty invite params", () => {
    assert.equal(parseInviteSearch("?invite="), null);
    assert.equal(parseInviteSearch("?invite=!!!"), null);
    assert.deepEqual(parseInviteSearch("?invite=javascript:alert(1)"), {
      code: "javascriptalert1",
      src: "",
    });
    assert.deepEqual(parseInviteSearch("?invite=OPC_Ada-99&src=GitHub!!"), {
      code: "opc_ada-99",
      src: "github",
    });
    assert.equal(sanitizeInviteCode("javascript:alert(1)").includes(":"), false);
    assert.equal(publicInviteUrl("<script>"), "https://opencommunity.app/?invite=script");
  });
});

describe("member number as invite code", () => {
  it("maps OPC-XXXX to invite=opc-xxxx and binds the share code", () => {
    assert.equal(inviteCodeFromMemberId("OPC-7K3M"), "opc-7k3m");
    const store = memoryStore();
    const code = bindShareCodeToMemberId("OPC-7K3M", store);
    assert.equal(code, "opc-7k3m");
    assert.equal(readOrCreateShareCode(store, () => "opc-other"), "opc-7k3m");
    assert.equal(resolveShareCode("OPC-AB23", memoryStore()), "opc-ab23");
    assert.match(publicInviteUrl(code), /invite=opc-7k3m/);
  });
});

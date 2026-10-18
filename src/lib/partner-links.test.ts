import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import { fr } from "./i18n/fr.ts";
import {
  HITL_POOL_OPT_IN_KEY,
  PARTNER_LINKS,
  PARTNER_LINKS_FLAG,
  isPartnerLinksEnabled,
  partnerLinkHref,
  readHitlPoolOptIn,
  writeHitlPoolOptIn,
} from "./partner-links.ts";

function memoryStore() {
  const mem = new Map<string, string>();
  return {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
    clear: () => mem.clear(),
    key: () => null,
    length: 0,
    mem,
  } as unknown as Storage & { mem: Map<string, string> };
}

describe("partner links flag", () => {
  it("is OFF unless the value is exactly 1", () => {
    assert.equal(PARTNER_LINKS_FLAG, "NEXT_PUBLIC_PARTNER_LINKS");
    for (const raw of [undefined, "", "0", "true", "yes", "01", "on"]) {
      assert.equal(isPartnerLinksEnabled(raw), false, String(raw));
    }
    assert.equal(isPartnerLinksEnabled("1"), true);
    assert.equal(isPartnerLinksEnabled(" 1 "), true);
  });

  it("is OFF in this test build (no env set)", () => {
    assert.equal(process.env.NEXT_PUBLIC_PARTNER_LINKS, undefined);
    assert.equal(isPartnerLinksEnabled(), false);
  });
});

describe("partner link placeholders", () => {
  it("ships Mercor and micro1 with empty urls (no real code or link)", () => {
    assert.deepEqual(
      PARTNER_LINKS.map((link) => link.id),
      ["mercor", "micro1"],
    );
    for (const link of PARTNER_LINKS) {
      assert.equal(link.url, "");
      assert.equal(partnerLinkHref(link), null);
    }
  });

  it("only accepts https urls", () => {
    assert.equal(partnerLinkHref({ url: "https://example.com/r/abc" }), "https://example.com/r/abc");
    assert.equal(partnerLinkHref({ url: "http://example.com/" }), null);
    assert.equal(partnerLinkHref({ url: "javascript:alert(1)" }), null);
    assert.equal(partnerLinkHref({ url: "{{LIEN_MICRO1}}" }), null);
    assert.equal(partnerLinkHref({ url: "   " }), null);
  });
});

describe("HITL pool opt-in", () => {
  it("defaults to not opted in", () => {
    assert.equal(readHitlPoolOptIn(memoryStore()), null);
  });

  it("stores only optedIn + timestamp on this device, and unchecks", () => {
    const store = memoryStore();
    writeHitlPoolOptIn(true, store, new Date("2026-10-18T12:00:00.000Z"));
    assert.deepEqual(readHitlPoolOptIn(store), { optedIn: true, at: "2026-10-18T12:00:00.000Z" });
    assert.deepEqual(Object.keys(JSON.parse(store.mem.get(HITL_POOL_OPT_IN_KEY)!)).sort(), ["at", "optedIn"]);

    writeHitlPoolOptIn(false, store, new Date("2026-10-18T13:00:00.000Z"));
    assert.equal(readHitlPoolOptIn(store), null);
  });

  it("treats garbage as not opted in", () => {
    const store = memoryStore();
    for (const raw of ["true", "{", '{"optedIn":"yes","at":"x"}', '{"optedIn":true}']) {
      store.setItem(HITL_POOL_OPT_IN_KEY, raw);
      assert.equal(readHitlPoolOptIn(store), null, raw);
    }
  });
});

describe("partner links copy", () => {
  it("has the same shape in FR, EN and ES", () => {
    const keys = Object.keys(fr.earnNow.partners).sort();
    assert.deepEqual(Object.keys(en.earnNow.partners).sort(), keys);
    assert.deepEqual(Object.keys(es.earnNow.partners).sort(), keys);
    assert.equal(en.earnNow.partners.knowItems.length, fr.earnNow.partners.knowItems.length);
    assert.equal(es.earnNow.partners.knowItems.length, fr.earnNow.partners.knowItems.length);
  });

  it("uses the approved FR wording and opt-in label", () => {
    const p = fr.earnNow.partners;
    assert.equal(p.title, "Travailler pour l’IA depuis chez toi");
    assert.equal(p.poolOptInLabel, "Je veux rejoindre le bassin OPC (tâches HITL futures)");
    assert.equal(p.partnerTag, "lien partenaire");
    assert.match(p.knowItems[0], /^C’est gratuit\./);
    assert.match(p.knowItems[1], /Essaim-Agents Inc\./);
    assert.match(p.knowItems[2], /ni emploi ni revenu/);
    assert.match(p.contact, /contact@essaim-agents\.com/);
  });

  it("consent says device-only, optional, revocable, and no bonus sharing", () => {
    for (const p of [fr.earnNow.partners, en.earnNow.partners, es.earnNow.partners]) {
      assert.ok(p.poolConsent.length > 80);
    }
    assert.match(fr.earnNow.partners.poolConsent, /facultative/);
    assert.match(fr.earnNow.partners.poolConsent, /rien n’est envoyé/);
    assert.match(fr.earnNow.partners.poolConsent, /décocher/);
    assert.match(fr.earnNow.partners.poolConsent, /Aucune prime n’est partagée/);
    assert.match(en.earnNow.partners.poolConsent, /nothing is sent/);
    assert.match(es.earnNow.partners.poolConsent, /no se envía nada/);
  });
});

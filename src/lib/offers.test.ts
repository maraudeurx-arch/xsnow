import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canPublish,
  carMorningDefaults,
  decodeSharePayload,
  demandPath,
  DRAFT_HOTSPOT_ID,
  DRAFT_UX_SESSION_ID,
  encodeSharePayload,
  featuredCarMorningOffer,
  formatHourFr,
  hotspotDefaults,
  mergeBrowseOffers,
  normalizePaypalMe,
  offerFromForm,
  offerKindQuery,
  parseOfferKindQuery,
  parseOfferTemplateQuery,
  parseStoredOffer,
  paypalMeUrl,
  publishIssues,
  sharePostFr,
  toSharePayload,
  draftShareText,
  readEditedShareText,
  shareTextKey,
  unpublishedTemplateOffer,
  uxSessionDefaults,
  writeEditedShareText,
  mailtoHref,
  offerFromSharePayload,
} from "./offers.ts";

describe("publishIssues", () => {
  it("blocks publish without Interac, insurance, and gas", () => {
    const draft = carMorningDefaults();
    assert.deepEqual(publishIssues(draft).sort(), ["insurance", "interac"].sort());
    assert.equal(canPublish(draft), false);

    draft.interacContact = "voisin@example.com";
    draft.insuranceOk = true;
    draft.gasBorrowerPays = true;
    assert.deepEqual(publishIssues(draft), []);
    assert.equal(canPublish(draft), true);
  });

  it("requires borrower-pays-gas", () => {
    const draft = {
      ...carMorningDefaults(),
      interacContact: "8195550101",
      insuranceOk: true,
      gasBorrowerPays: false,
    };
    assert.ok(publishIssues(draft).includes("gas"));
  });

  it("lets hotspot and UX drafts publish without insurance or gas", () => {
    const hotspot = {
      ...hotspotDefaults(),
      interacContact: "voisin@opc.test",
    };
    assert.deepEqual(publishIssues(hotspot), []);
    assert.equal(canPublish(hotspot), true);
    assert.equal(offerFromForm(hotspot).kind, "hotspot");
    assert.equal(offerFromForm(hotspot).published, true);
    assert.equal(offerFromForm(hotspot).gasBorrowerPays, false);
    assert.equal(offerFromForm(hotspot).insuranceOk, false);

    const ux = { ...uxSessionDefaults(), interacContact: "8195550101" };
    assert.deepEqual(publishIssues(ux), []);
    assert.equal(offerFromForm(ux).kind, "ux_session");
  });
});

describe("sharePostFr", () => {
  it("includes the public site, window, price, and Interac", () => {
    const offer = offerFromForm({
      ...carMorningDefaults(),
      neighborhood: "Hull",
      interacContact: "opc@example.com",
      insuranceOk: true,
      notes: "Non-fumeur, 50 km max.",
    });
    const text = sharePostFr(offer);
    assert.match(text, /Prêt de voiture le matin/);
    assert.match(text, /5 h/);
    assert.match(text, /12 h/);
    assert.match(text, /Hull/);
    assert.match(text, /opc@example\.com/);
    assert.match(text, /https:\/\/maraudeurx-arch\.github\.io\/xsnow\//);
    assert.match(text, /en-demande/);
    assert.match(text, /Non-fumeur/);
    assert.match(text, /babillard/);
  });
});

describe("share payload round-trip", () => {
  it("encodes and decodes compact offer fields", () => {
    const offer = offerFromForm({
      ...carMorningDefaults(),
      title: "Prêt de voiture le matin",
      neighborhood: "Aylmer",
      interacContact: "819-555-0101",
      paypalMe: "https://www.paypal.me/gatineauopc",
      insuranceOk: true,
    });
    const encoded = encodeSharePayload(toSharePayload(offer));
    const decoded = decodeSharePayload(encoded);
    assert.ok(decoded);
    assert.equal(decoded?.k, "car_morning");
    assert.equal(decoded?.n, "Aylmer");
    assert.equal(decoded?.i, "819-555-0101");
    assert.equal(decoded?.p, 35);
    assert.equal(decoded?.y, "gatineauopc");
    assert.match(demandPath(decoded ?? undefined), /\?kind=car-morning&o=/);
    assert.equal(encoded.includes("+"), false);
    assert.equal(encoded.includes("/"), false);
  });
});

describe("paypal.me", () => {
  it("normalizes handles and builds a url", () => {
    assert.equal(normalizePaypalMe("https://paypal.me/MonVoisin"), "MonVoisin");
    assert.equal(paypalMeUrl("MonVoisin"), "https://www.paypal.me/MonVoisin");
  });

  it("rejects javascript: and non-handle junk", () => {
    assert.equal(normalizePaypalMe("javascript:alert(1)"), "");
    assert.equal(paypalMeUrl("javascript:alert(1)"), "");
    assert.equal(paypalMeUrl("<script>alert(1)</script>"), "");
    assert.equal(mailtoHref("javascript:alert(1)@evil.com", "hi", "body"), "");
    assert.match(mailtoHref("voisin@example.com", "Sujet", "Corps"), /^mailto:/);
  });
});

describe("mergeBrowseOffers", () => {
  it("shows the featured car morning offer when nothing is published", () => {
    const list = mergeBrowseOffers([], [], null);
    assert.equal(list[0]?.id, featuredCarMorningOffer().id);
    assert.equal(list[0]?.kind, "car_morning");
  });

  it("prefers a published local offer over the featured placeholder", () => {
    const mine = offerFromForm({
      ...carMorningDefaults(),
      interacContact: "me@opc.test",
      insuranceOk: true,
    });
    const list = mergeBrowseOffers([mine], [], null);
    assert.equal(list.some((item) => item.id === featuredCarMorningOffer().id), false);
    assert.equal(list[0]?.interacContact, "me@opc.test");
  });
});

describe("edited share text persistence", () => {
  it("uses opc-share-text:<id> keys", () => {
    assert.equal(shareTextKey("abc"), "opc-share-text:abc");
  });

  it("reloads last edited text per offer id", () => {
    const data = new Map<string, string>();
    const previous = (globalThis as { window?: unknown }).window;
    (globalThis as { window: unknown }).window = {
      localStorage: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => {
          data.set(key, value);
        },
      },
    };

    try {
      const offer = offerFromForm({
        ...carMorningDefaults(),
        interacContact: "me@opc.test",
        insuranceOk: true,
      });
      const generated = draftShareText(offer);
      assert.match(generated, /github\.io\/xsnow/);
      writeEditedShareText(offer.id, "Texte Marketplace modifié");
      assert.equal(readEditedShareText(offer.id), "Texte Marketplace modifié");
      assert.equal(draftShareText(offer), "Texte Marketplace modifié");
      assert.equal(data.get(`opc-share-text:${offer.id}`), "Texte Marketplace modifié");
    } finally {
      if (previous === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = previous;
      }
    }
  });
});

describe("formatHourFr", () => {
  it("drops :00", () => {
    assert.equal(formatHourFr("05:00"), "5 h");
    assert.equal(formatHourFr("12:30"), "12 h 30");
  });
});

describe("earn-now offer templates", () => {
  it("parses kind and template query strings", () => {
    assert.equal(parseOfferKindQuery("car-morning"), "car_morning");
    assert.equal(parseOfferKindQuery("hotspot"), "hotspot");
    assert.equal(parseOfferKindQuery("ux-session"), "ux_session");
    assert.equal(parseOfferTemplateQuery("ux"), "ux_session");
    assert.equal(parseOfferTemplateQuery("hotspot"), "hotspot");
    assert.equal(offerKindQuery("ux_session"), "ux-session");
  });

  it("stores unpublished hotspot and UX helpers without listing them in En demande", () => {
    const hotspot = unpublishedTemplateOffer("hotspot");
    const ux = unpublishedTemplateOffer("ux_session");
    assert.equal(hotspot.id, DRAFT_HOTSPOT_ID);
    assert.equal(ux.id, DRAFT_UX_SESSION_ID);
    assert.equal(hotspot.published, false);
    assert.equal(ux.published, false);
    assert.match(hotspot.title, /Hotspot/);
    assert.match(ux.title, /test utilisateur/i);

    const list = mergeBrowseOffers([hotspot, ux], [], null);
    assert.equal(list.some((item) => item.id === DRAFT_HOTSPOT_ID), false);
    assert.equal(list.some((item) => item.id === DRAFT_UX_SESSION_ID), false);
    assert.equal(list.some((item) => item.id === featuredCarMorningOffer().id), true);
  });

  it("shares hotspot offers with kind=hotspot and no gas line", () => {
    const offer = offerFromForm({
      ...hotspotDefaults(),
      neighborhood: "Hull",
      interacContact: "opc@example.com",
    });
    const text = sharePostFr(offer);
    assert.match(text, /Hotspot/);
    assert.match(text, /Hull/);
    assert.match(text, /kind=hotspot/);
    assert.doesNotMatch(text, /essence/);
    const decoded = decodeSharePayload(encodeSharePayload(toSharePayload(offer)));
    assert.equal(decoded?.k, "hotspot");
    assert.match(demandPath(decoded ?? undefined), /\?kind=hotspot&o=/);
  });
});

describe("untrusted offer fields", () => {
  it("strips script tags from notes and share payloads", () => {
    const offer = offerFromForm({
      ...carMorningDefaults(),
      interacContact: "voisin@example.com",
      insuranceOk: true,
      notes: "<script>alert(1)</script> Non-fumeur javascript:alert(1)",
    });
    assert.doesNotMatch(offer.notes, /<script|javascript:/i);
    assert.match(offer.notes, /Non-fumeur/);
    assert.equal(offer.interacContact, "voisin@example.com");

    const poisoned = offerFromSharePayload({
      k: "car_morning",
      t: "<img src=x onerror=alert(1)> Prêt",
      f: "05:00",
      u: "12:00",
      p: 35,
      n: "Hull",
      i: "voisin@example.com",
      o: "<script>alert(1)</script> essence",
      y: "javascript:alert(1)",
    });
    assert.doesNotMatch(poisoned.title, /<img|onerror/i);
    assert.doesNotMatch(poisoned.notes, /<script/i);
    assert.equal(poisoned.paypalMe, "");
    assert.equal(paypalMeUrl(poisoned.paypalMe), "");

    assert.equal(
      parseStoredOffer({
        kind: "car_morning",
        id: "abc",
        title: "<script>x</script>",
        priceCad: 35,
        published: true,
      }),
      null,
    );
    assert.equal(decodeSharePayload("a".repeat(5000)), null);
  });
});

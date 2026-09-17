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
  FEATURED_CAR_MORNING_ID,
  formatHourFr,
  hotspotDefaults,
  isInjectedSeedId,
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
  skillsDefaults,
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

  it("publishes a skills listing without Interac into En demande", () => {
    const draft = skillsDefaults();
    assert.ok(publishIssues(draft).includes("skills"));
    assert.ok(publishIssues(draft).includes("days"));
    const ready = {
      ...draft,
      skillIds: ["mechanic", "other"] as const,
      skillOther: "<b>Soudure</b>",
      availabilityDays: ["lun", "ven"] as const,
    };
    assert.deepEqual(publishIssues(ready), []);
    const offer = offerFromForm(ready);
    assert.equal(offer.kind, "skills");
    assert.equal(offer.published, true);
    assert.equal(offer.priceCad, 0);
    assert.equal(offer.interacContact, "");
    assert.equal(offer.skillOther, "Soudure");
    assert.deepEqual(offer.skillIds, ["mechanic", "other"]);
    assert.deepEqual(offer.availabilityDays, ["lun", "ven"]);
    assert.doesNotMatch(offer.title, /<b>/);
    const list = mergeBrowseOffers([offer], [], null);
    assert.equal(list.length, 1);
    assert.equal(list[0]?.kind, "skills");
    const stored = parseStoredOffer(JSON.parse(JSON.stringify(offer)));
    assert.equal(stored?.kind, "skills");
    assert.equal(stored?.skillOther, "Soudure");
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
    assert.match(text, /https:\/\/opencommunity\.app\//);
    assert.match(text, /en-demande/);
    assert.match(text, /Non-fumeur/);
    assert.match(text, /babillard/);
    const untitledArea = offerFromForm({
      ...carMorningDefaults(),
      neighborhood: "",
      interacContact: "opc@example.com",
      insuranceOk: true,
    });
    assert.doesNotMatch(sharePostFr(untitledArea), /Gatineau/);
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
  it("starts empty: no bundled Gatineau car listing", () => {
    const list = mergeBrowseOffers([], [], null);
    assert.equal(list.length, 0);
    assert.equal(list.some((item) => item.id === FEATURED_CAR_MORNING_ID), false);
    assert.equal(isInjectedSeedId(FEATURED_CAR_MORNING_ID), true);
    assert.equal(isInjectedSeedId("seed-courses-1"), true);
  });

  it("keeps a published local offer on this device only", () => {
    const mine = offerFromForm({
      ...carMorningDefaults(),
      interacContact: "me@opc.test",
      insuranceOk: true,
    });
    const list = mergeBrowseOffers([mine], [], null);
    assert.equal(list.length, 1);
    assert.equal(list[0]?.interacContact, "me@opc.test");
    assert.equal(mergeBrowseOffers([], [], null).some((item) => item.id === mine.id), false);
  });

  it("shows approved catalog offers without mixing in another device’s list", () => {
    const catalog = offerFromForm({
      ...hotspotDefaults(),
      title: "Hotspot approuvé",
      interacContact: "catalog@opc.test",
    });
    const otherDevice = offerFromForm({
      ...carMorningDefaults(),
      title: "Offre d’un autre téléphone",
      interacContact: "other@opc.test",
      insuranceOk: true,
    });
    const list = mergeBrowseOffers([], [], null, [catalog]);
    assert.equal(list.length, 1);
    assert.equal(list[0]?.title, "Hotspot approuvé");
    assert.equal(list.some((item) => item.id === otherDevice.id), false);
  });

  it("drops the legacy featured id even if it was stored", () => {
    const featured = {
      ...offerFromForm({
        ...carMorningDefaults(),
        interacContact: "hidden@opc.test",
        insuranceOk: true,
      }),
      id: FEATURED_CAR_MORNING_ID,
      published: true,
      neighborhood: "Gatineau",
    };
    const list = mergeBrowseOffers([featured], [], null);
    assert.equal(list.length, 0);
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
      assert.match(generated, /opencommunity\.app/);
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
    assert.equal(list.length, 0);
    assert.equal(list.some((item) => item.id === FEATURED_CAR_MORNING_ID), false);
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

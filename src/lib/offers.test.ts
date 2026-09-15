import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canPublish,
  carMorningDefaults,
  decodeSharePayload,
  demandPath,
  encodeSharePayload,
  featuredCarMorningOffer,
  formatHourFr,
  mergeBrowseOffers,
  normalizePaypalMe,
  offerFromForm,
  paypalMeUrl,
  publishIssues,
  sharePostFr,
  toSharePayload,
  draftShareText,
  readEditedShareText,
  shareTextKey,
  writeEditedShareText,
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

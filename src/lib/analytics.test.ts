import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enqueue,
  looksLikeCoordinates,
  looksLikeMonetizeSuggestion,
  pendingEvents,
  readOrCreateAnonId,
  resetAnalyticsQueue,
  sanitizeCity,
  sanitizeSuggestion,
  setAnalyticsConsentOverride,
  statsEndpoint,
  toAnalyticsEvent,
} from "./analytics.ts";
import { parseStatsEvents } from "../../workers/xsnow-chat/src/stats.ts";

describe("looksLikeMonetizeSuggestion", () => {
  it("matches the v1 keyword list including accents", () => {
    assert.equal(looksLikeMonetizeSuggestion("Je veux monétiser la livraison"), true);
    assert.equal(looksLikeMonetizeSuggestion("I'd like to monetize snow removal"), true);
    assert.equal(looksLikeMonetizeSuggestion("Une suggestion : garde d'enfants"), true);
    assert.equal(looksLikeMonetizeSuggestion("Un nouveau service de courses"), true);
    assert.equal(looksLikeMonetizeSuggestion("Une activité payante le week-end"), true);
    assert.equal(looksLikeMonetizeSuggestion("A neighbourhood activity for teens"), true);
    assert.equal(looksLikeMonetizeSuggestion("Bonjour, quel temps fait-il ?"), false);
  });
});

describe("sanitizeSuggestion", () => {
  it("caps at 280, redacts email, drops coordinates", () => {
    assert.equal(sanitizeSuggestion("a".repeat(300)).length, 280);
    assert.match(sanitizeSuggestion("Idée: write me at ada@example.com please"), /\[redacted\]/);
    assert.equal(sanitizeSuggestion("Meet at 45.4765, -75.7013"), "");
  });
});

describe("place payload", () => {
  it("keeps city-level fields and drops GPS", () => {
    const event = toAnalyticsEvent(
      {
        type: "place",
        city: "Gatineau",
        countryCode: "ca",
        lat: 45.47,
        lon: -75.7,
      },
      "anon-session-1",
      1,
    );
    assert.deepEqual(event, {
      type: "place",
      session: "anon-session-1",
      t: 1,
      city: "Gatineau",
      countryCode: "CA",
    });
    assert.equal(sanitizeCity("45.4765, -75.7013"), "");
    assert.equal(looksLikeCoordinates("40.7, -74.0"), true);
  });
});

describe("readOrCreateAnonId", () => {
  it("reuses the localStorage uuid", () => {
    const mem = new Map<string, string>();
    const store = {
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
    } as Storage;

    const first = readOrCreateAnonId(store, () => "11111111-1111-4111-8111-111111111111");
    const second = readOrCreateAnonId(store, () => "22222222-2222-4222-8222-222222222222");
    assert.equal(first, "11111111-1111-4111-8111-111111111111");
    assert.equal(second, first);
  });
});

describe("statsEndpoint", () => {
  it("posts under /stats on the chat worker", () => {
    assert.equal(
      statsEndpoint("https://xsnow-chat.xsnowopc.workers.dev"),
      "https://xsnow-chat.xsnowopc.workers.dev/stats",
    );
  });
});

describe("worker parseStatsEvents", () => {
  it("accepts a batch and strips GPS / email-like text", () => {
    resetAnalyticsQueue();
    const parsed = parseStatsEvents({
      events: [
        { type: "session_start", session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", t: 1 },
        { type: "lang", session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", lang: "fr", t: 2 },
        {
          type: "place",
          session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          city: "Gatineau",
          countryCode: "CA",
          lat: 45.47,
          lon: -75.7,
          t: 3,
        },
        {
          type: "monetize_suggestion",
          session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          text: "Monétiser la livraison  contact jane@opc.test",
          t: 4,
        },
        { type: "place", session: "nope", city: "X", countryCode: "CA" },
        {
          type: "offer_created",
          session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          kind: "car_morning",
          email: "secret@opc.test",
          t: 5,
        },
        {
          type: "request_created",
          session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          kind: "car_morning",
          name: "Ada",
          t: 6,
        },
      ],
    });
    assert.equal(parsed.length, 6);
    assert.equal(parsed[2]?.city, "Gatineau");
    assert.equal("lat" in (parsed[2] ?? {}), false);
    assert.match(parsed[3]?.text ?? "", /\[redacted\]/);
    assert.equal(parsed[4]?.type, "offer_created");
    assert.equal(parsed[4]?.text, "car_morning");
    assert.equal("email" in (parsed[4] ?? {}), false);
    assert.equal(parsed[5]?.type, "request_created");
    assert.equal("name" in (parsed[5] ?? {}), false);
  });
});

describe("offer/request analytics", () => {
  it("keeps kind only and drops contact-like fields", () => {
    const event = toAnalyticsEvent(
      {
        type: "offer_created",
        kind: "Car Morning!!",
        email: "owner@opc.test",
        phone: "8195550101",
      },
      "anon-session-1",
      9,
    );
    assert.deepEqual(event, {
      type: "offer_created",
      session: "anon-session-1",
      t: 9,
      kind: "car_morning",
    });
  });
});

describe("analytics consent gate", () => {
  it("does not enqueue until consent is granted", () => {
    resetAnalyticsQueue();
    setAnalyticsConsentOverride(false);
    enqueue({ type: "session_start", session: "s", t: 1 });
    assert.deepEqual(pendingEvents(), []);
    setAnalyticsConsentOverride(true);
    enqueue({ type: "session_start", session: "s", t: 1 });
    assert.equal(pendingEvents().length, 1);
    resetAnalyticsQueue();
    setAnalyticsConsentOverride(null);
  });
});

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
    assert.equal(looksLikeMonetizeSuggestion("J’ai une idée pour le quartier"), true);
    assert.equal(looksLikeMonetizeSuggestion("Bonjour, quel temps fait-il ?"), false);
  });
});

describe("sanitizeSuggestion", () => {
  it("caps at 280, redacts email, drops coordinates", () => {
    assert.equal(sanitizeSuggestion("a".repeat(300)).length, 280);
    assert.match(sanitizeSuggestion("Idée: write me at ada@example.com please"), /\[redacted\]/);
    assert.equal(sanitizeSuggestion("Meet at 45.4765, -75.7013"), "");
  });

  it("strips script tags before analytics POST", () => {
    assert.doesNotMatch(
      sanitizeSuggestion("<script>alert(1)</script> Monétiser la livraison javascript:alert(1)"),
      /<script|javascript:/i,
    );
    assert.match(
      sanitizeSuggestion("<script>alert(1)</script> Monétiser la livraison"),
      /Monétiser la livraison/,
    );
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
        {
          type: "idea_submit",
          session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          text: "tete+mains",
          t: 7,
        },
        {
          type: "invite_open",
          session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          text: "ami|critique",
          t: 8,
        },
        {
          type: "feedback_pos",
          session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          text: "accueil",
          t: 9,
        },
      ],
    });
    assert.equal(parsed.length, 9);
    assert.equal(parsed[2]?.city, "Gatineau");
    assert.equal("lat" in (parsed[2] ?? {}), false);
    assert.match(parsed[3]?.text ?? "", /\[redacted\]/);
    assert.equal(parsed[4]?.type, "offer_created");
    assert.equal(parsed[4]?.text, "car_morning");
    assert.equal("email" in (parsed[4] ?? {}), false);
    assert.equal(parsed[5]?.type, "request_created");
    assert.equal("name" in (parsed[5] ?? {}), false);
    assert.equal(parsed[6]?.type, "idea_submit");
    assert.equal(parsed[6]?.text, "tete+mains");
    assert.equal(parsed[7]?.type, "invite_open");
    assert.equal(parsed[7]?.text, "ami|critique");
    assert.equal(parsed[8]?.type, "feedback_pos");
  });

  it("stores idea_submit / monetize_suggestion as plain text without scripts", () => {
    const parsed = parseStatsEvents({
      events: [
        {
          type: "monetize_suggestion",
          session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          text: "<script>alert(1)</script> data:text/html,x javascript:alert(1) Une idée de quartier",
          t: 1,
        },
        {
          type: "idea_submit",
          session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          text: "tete+<img src=x onerror=alert(1)>mains",
          t: 2,
        },
      ],
    });
    assert.equal(parsed.length, 2);
    assert.doesNotMatch(parsed[0]?.text ?? "", /<script|javascript:|data:/i);
    assert.match(parsed[0]?.text ?? "", /idée/i);
    assert.equal(parsed[1]?.text.includes("<"), false);
    assert.match(parsed[1]?.text ?? "", /tete/);
    assert.match(parsed[1]?.text ?? "", /mains/);
  });

  it("accepts feedback_neg", () => {
    const parsed = parseStatsEvents({
      events: [
        {
          type: "feedback_neg",
          session: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          text: "vos-idees",
          t: 1,
        },
      ],
    });
    assert.equal(parsed[0]?.type, "feedback_neg");
    assert.equal(parsed[0]?.text, "vos-idees");
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

describe("community idea analytics", () => {
  it("maps a Vos idées snippet onto monetize_suggestion without GPS or email", () => {
    const event = toAnalyticsEvent(
      {
        type: "monetize_suggestion",
        text: "[tete+mains 2h @Hull] Déneiger les allées  write me at ada@example.com",
        lat: 45.47,
        email: "ada@example.com",
      },
      "anon-session-1",
      9,
    );
    assert.deepEqual(
      {
        type: event?.type,
        text: event && "text" in event ? event.text : "",
        hasLat: event ? "lat" in event : false,
        hasEmail: event ? "email" in event : false,
      },
      {
        type: "monetize_suggestion",
        text: "[tete+mains 2h @Hull] Déneiger les allées write me at [redacted]",
        hasLat: false,
        hasEmail: false,
      },
    );
  });
});

describe("client-side stats event parsing", () => {
  it("keeps idea_submit / invite_open text and drops GPS", () => {
    const idea = toAnalyticsEvent(
      { type: "idea_submit", text: "tete+mains", lat: 45.47, email: "ada@opc.test" },
      "anon-session-1",
      3,
    );
    assert.deepEqual(idea, {
      type: "idea_submit",
      session: "anon-session-1",
      t: 3,
      text: "tete+mains",
    });
    const invite = toAnalyticsEvent(
      { type: "invite_open", text: "ami|critique<script>", lon: -75.7 },
      "anon-session-1",
      4,
    );
    assert.equal(invite?.type, "invite_open");
    assert.equal(invite && "text" in invite ? invite.text : "", "ami|critique");
    assert.equal(invite && "lon" in invite, false);
    assert.equal(toAnalyticsEvent({ type: "unknown" }, "anon-session-1"), null);
    assert.equal(toAnalyticsEvent({ type: "place", city: "", countryCode: "CA" }, "s"), null);
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

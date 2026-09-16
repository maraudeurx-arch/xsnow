import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alertsConsentEndpoint,
  alertsEndpoint,
  alertsPingEndpoint,
  fetchAlertInvite,
  postAlertConsent,
  postAlertPing,
  postAlertRegister,
} from "./alert-relay.ts";
import { defaultSchedule } from "./proximity-alerts.ts";

describe("alert relay URLs", () => {
  it("points at /alerts on the chat worker", () => {
    assert.equal(alertsEndpoint("https://xsnow-chat.xsnowopc.workers.dev"), "https://xsnow-chat.xsnowopc.workers.dev/alerts");
    assert.equal(alertsConsentEndpoint("https://worker.test"), "https://worker.test/alerts/consent");
    assert.equal(alertsPingEndpoint("https://worker.test/"), "https://worker.test/alerts/ping");
  });
});

describe("postAlertRegister / consent / ping", () => {
  it("POSTs JSON and treats ok:true as sent", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), body: String(init?.body || "") });
      return new Response(JSON.stringify({ ok: true, persisted: true }), { status: 200 });
    };
    const registered = await postAlertRegister(
      {
        token: "alr-abcdefghjk",
        person: "Léo",
        place: "École",
        placeLat: 45.4,
        placeLon: -75.7,
        radiusKm: 10,
        schedule: defaultSchedule(),
        phone: "819-555-0100",
        email: "",
      },
      fakeFetch,
    );
    assert.equal(registered, "sent");
    assert.match(calls[0]?.url ?? "", /\/alerts$/);

    const consented = await postAlertConsent({ token: "alr-abcdefghjk", granted: true }, fakeFetch);
    assert.equal(consented, "sent");
    assert.match(calls[1]?.url ?? "", /\/alerts\/consent$/);

    const ping = await postAlertPing({ token: "alr-abcdefghjk", lat: 45.5, lon: -75.8 }, async (input, init) => {
      calls.push({ url: String(input), body: String(init?.body || "") });
      return new Response(
        JSON.stringify({ ok: true, scheduled: true, outside: true, distanceKm: 12, sms: { sent: false, reason: "not_configured" } }),
        { status: 200 },
      );
    });
    assert.equal(ping.result, "sent");
    assert.equal(ping.payload?.sms?.reason, "not_configured");
    assert.equal(JSON.stringify(calls).includes("TWILIO"), false);
  });

  it("returns failed on network errors without throwing", async () => {
    const boom: typeof fetch = async () => {
      throw new Error("offline");
    };
    assert.equal(await postAlertRegister({
      token: "alr-abcdefghjk",
      person: "Léo",
      place: "École",
      placeLat: null,
      placeLon: null,
      radiusKm: 5,
      schedule: defaultSchedule(),
      phone: "",
      email: "",
    }, boom), "failed");
    assert.equal(await postAlertConsent({ token: "alr-abcdefghjk", granted: true }, boom), "failed");
    assert.equal((await postAlertPing({ token: "alr-abcdefghjk", lat: 1, lon: 2 }, boom)).result, "failed");
    assert.equal(await fetchAlertInvite("alr-abcdefghjk", boom), null);
  });
});

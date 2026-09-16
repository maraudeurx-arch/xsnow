import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_ALERT_FROM_EMAIL,
  RESEND_API_URL,
  buildAlertMailText,
  buildAlertSmsBody,
  sendAlertMail,
  sendAlertSms,
  twilioMessagesUrl,
} from "./alert-sms.ts";

describe("alert SMS copy", () => {
  it("stays honest: Open Community, not Apple Find My", () => {
    const body = buildAlertSmsBody({
      to: "+18195550100",
      person: "Léo",
      place: "École",
      distanceKm: 12.4,
      radiusKm: 10,
    });
    assert.match(body, /OPC/);
    assert.match(body, /Léo/);
    assert.match(body, /12 km/);
    assert.match(body, /Apple Localiser/);
    assert.doesNotMatch(body, /iCloud|Find My|Messages inbox/i);
    assert.match(buildAlertSmsBody({ to: "+1", person: "Léo", place: "École", distanceKm: 8, radiusKm: 5, locale: "en" }), /Find My/);
  });
});

describe("sendAlertSms", () => {
  it("does not send when Twilio env is missing", async () => {
    const result = await sendAlertSms({}, {
      to: "819-555-0100",
      person: "Léo",
      place: "École",
      distanceKm: 12,
      radiusKm: 5,
    }, async () => {
      throw new Error("should not fetch");
    });
    assert.deepEqual(result, { sent: false, reason: "not_configured" });
  });

  it("POSTs Twilio Messages.json with Basic auth and E.164 numbers", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init || {} });
      return new Response(JSON.stringify({ sid: "SM1" }), { status: 201 });
    };
    const result = await sendAlertSms(
      {
        TWILIO_ACCOUNT_SID: "ACtest",
        TWILIO_AUTH_TOKEN: "secret",
        TWILIO_FROM_NUMBER: "+18195550111",
      },
      {
        to: "819-555-0100",
        person: "Léo",
        place: "École de l’Île",
        distanceKm: 14,
        radiusKm: 10,
      },
      fakeFetch,
    );
    assert.equal(result.sent, true);
    assert.equal(calls[0]?.url, twilioMessagesUrl("ACtest"));
    const headers = new Headers(calls[0]?.init.headers);
    assert.match(headers.get("Authorization") || "", /^Basic /);
    const body = String(calls[0]?.init.body);
    assert.match(body, /To=%2B18195550100/);
    assert.match(body, /From=%2B18195550111/);
    assert.match(decodeURIComponent(body), /OPC/);
    assert.doesNotMatch(body, /TWILIO_AUTH_TOKEN|icloud/i);
  });

  it("soft-fails on HTTP or network errors", async () => {
    const http = await sendAlertSms(
      {
        TWILIO_ACCOUNT_SID: "ACtest",
        TWILIO_AUTH_TOKEN: "secret",
        TWILIO_FROM_NUMBER: "+18195550111",
      },
      { to: "+18195550100", person: "Léo", place: "École", distanceKm: 12, radiusKm: 5 },
      async () => new Response("nope", { status: 401 }),
    );
    assert.equal(http.sent, false);
    assert.equal(http.reason, "http_401");
    const net = await sendAlertSms(
      {
        TWILIO_ACCOUNT_SID: "ACtest",
        TWILIO_AUTH_TOKEN: "secret",
        TWILIO_FROM_NUMBER: "+18195550111",
      },
      { to: "+18195550100", person: "Léo", place: "École", distanceKm: 12, radiusKm: 5 },
      async () => {
        throw new Error("offline");
      },
    );
    assert.equal(net.sent, false);
    assert.equal(net.reason, "network");
  });
});

describe("sendAlertMail", () => {
  it("soft-fails without RESEND_API_KEY and never uses the owner inbox as destination", async () => {
    const missing = await sendAlertMail({}, {
      to: "tuteur@exemple.ca",
      person: "Léo",
      place: "École",
      distanceKm: 12,
      radiusKm: 5,
    }, async () => {
      throw new Error("should not fetch");
    });
    assert.deepEqual(missing, { sent: false, reason: "not_configured" });

    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init || {} });
      return new Response(JSON.stringify({ id: "re_1" }), { status: 200 });
    };
    const mail = buildAlertMailText({
      to: "tuteur@exemple.ca",
      person: "Léo",
      place: "École",
      distanceKm: 12,
      radiusKm: 5,
    });
    assert.match(mail.text, /Apple Localiser/);
    const sent = await sendAlertMail(
      { RESEND_API_KEY: "re_test" },
      { to: "tuteur@exemple.ca", person: "Léo", place: "École", distanceKm: 12, radiusKm: 5 },
      fakeFetch,
    );
    assert.equal(sent.sent, true);
    assert.equal(calls[0]?.url, RESEND_API_URL);
    const body = JSON.parse(String(calls[0]?.init.body));
    assert.deepEqual(body.to, ["tuteur@exemple.ca"]);
    assert.equal(JSON.stringify(body).includes("opencommunity.opc@gmail.com"), false);
    assert.equal(typeof DEFAULT_ALERT_FROM_EMAIL, "string");
  });
});

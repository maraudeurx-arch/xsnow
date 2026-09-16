import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultSchedule } from "../../../src/lib/proximity-alerts.ts";
import {
  handleAlertsConsent,
  handleAlertsGet,
  handleAlertsPing,
  handleAlertsRegister,
  isAlertsConsentPath,
  isAlertsPath,
  isAlertsPingPath,
  publicPreview,
  resetAlertMemory,
} from "./alerts.ts";

describe("alerts paths", () => {
  it("matches /alerts, /alerts/consent, /alerts/ping", () => {
    assert.equal(isAlertsPath("/alerts"), true);
    assert.equal(isAlertsPath("/alerts/"), true);
    assert.equal(isAlertsConsentPath("/alerts/consent"), true);
    assert.equal(isAlertsPingPath("/alerts/ping/"), true);
    assert.equal(isAlertsPath("/alerts/consent"), false);
    assert.equal(isAlertsPingPath("/alerts"), false);
  });
});

describe("consent relay", () => {
  it("registers, hides phone on GET, requires consent before ping, and soft-fails SMS", async () => {
    resetAlertMemory();
    const token = "alr-abcdefghjk";
    const body = {
      token,
      person: "Léo",
      place: "École de l’Île",
      placeLat: 45.4765,
      placeLon: -75.7013,
      radiusKm: 10,
      schedule: defaultSchedule(),
      phone: "819-555-0100",
      email: "tuteur@exemple.ca",
    };
    const registered = await handleAlertsRegister(body, {});
    assert.equal(registered.status, 200);
    assert.equal(registered.data.ok, true);
    assert.equal(registered.data.persisted, false);

    const got = await handleAlertsGet(new Request(`https://worker.test/alerts?token=${token}`), {});
    assert.equal(got.status, 200);
    const preview = (got.data as { alert: ReturnType<typeof publicPreview> }).alert;
    assert.equal(preview.person, "Léo");
    assert.equal(JSON.stringify(got.data).includes("819"), false);
    assert.equal(JSON.stringify(got.data).includes("tuteur@exemple.ca"), false);
    assert.equal(JSON.stringify(got.data).includes("icloud"), false);

    const deniedPing = await handleAlertsPing(
      { token, lat: 45.6, lon: -75.9 },
      {},
    );
    assert.equal(deniedPing.status, 403);

    const consent = await handleAlertsConsent({ token, granted: true }, {});
    assert.equal(consent.status, 200);
    assert.equal(consent.data.consent, "granted");

    const monday = new Date();
    monday.setHours(12, 0, 0, 0);
    while (monday.getDay() !== 1) monday.setDate(monday.getDate() + 1);

    const ping = await handleAlertsPing(
      { token, lat: 45.6, lon: -75.9 },
      {},
      monday.getTime(),
    );
    assert.equal(ping.status, 200);
    assert.equal(ping.data.ok, true);
    assert.equal(ping.data.outside, true);
    const sms = ping.data.sms as { sent: boolean; reason?: string };
    assert.equal(sms.sent, false);
    assert.equal(sms.reason, "not_configured");
  });

  it("rejects junk tokens and never asks for Apple credentials", async () => {
    resetAlertMemory();
    const bad = await handleAlertsRegister(
      { token: "icloud-password", person: "Léo", place: "École", radiusKm: 5 },
      {},
    );
    assert.equal(bad.status, 400);
    const missing = await handleAlertsGet(new Request("https://worker.test/alerts"), {});
    assert.equal(missing.status, 400);
  });
});

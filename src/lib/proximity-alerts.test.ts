import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distanceKm } from "./geo-logic.ts";
import {
  ALERT_RADII_KM,
  WEEKDAYS,
  alertFromForm,
  applyConsent,
  applyPing,
  createAlertToken,
  defaultSchedule,
  enabledDaysSummary,
  evaluateGeofence,
  isWithinSchedule,
  parseAlertInviteSearch,
  parseRadiusKm,
  parseStoredAlert,
  parseWeeklySchedule,
  publicAlertInviteUrl,
  sanitizeAlertToken,
  shareFromAlert,
  toE164,
  type WeeklySchedule,
} from "./proximity-alerts.ts";

function at(iso: string) {
  return new Date(iso);
}

describe("parseRadiusKm", () => {
  it("only accepts 5 / 10 / 20 km", () => {
    assert.deepEqual(ALERT_RADII_KM, [5, 10, 20]);
    assert.equal(parseRadiusKm(5), 5);
    assert.equal(parseRadiusKm(10), 10);
    assert.equal(parseRadiusKm(20), 20);
    assert.equal(parseRadiusKm("10 km"), 10);
    assert.equal(parseRadiusKm("200 m"), 5);
    assert.equal(parseRadiusKm("15"), 20);
    assert.equal(parseRadiusKm(""), 5);
    assert.equal(parseRadiusKm("apple find my"), 5);
  });
});

describe("weekly schedule", () => {
  it("defaults every day 08:00–18:00 and parses partial objects", () => {
    const schedule = defaultSchedule();
    assert.deepEqual(WEEKDAYS, ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]);
    assert.equal(schedule.lun.enabled, true);
    assert.equal(schedule.lun.start, "08:00");
    const parsed = parseWeeklySchedule({
      lun: { enabled: true, start: "07:30", end: "15:00" },
      dim: { enabled: false },
    });
    assert.equal(parsed.lun.start, "07:30");
    assert.equal(parsed.lun.end, "15:00");
    assert.equal(parsed.dim.enabled, false);
    assert.equal(parsed.sam.enabled, false);
  });

  it("uses device-local weekday hours, including overnight windows", () => {
    const weekday: WeeklySchedule = {
      ...defaultSchedule(),
      lun: { enabled: true, start: "08:00", end: "16:00" },
      mar: { enabled: false, start: "08:00", end: "16:00" },
      mer: { enabled: true, start: "22:00", end: "06:00" },
    };
    const mondayNoon = at("2026-09-14T16:00:00.000Z");
    mondayNoon.setHours(12, 0, 0, 0);
    assert.equal(mondayNoon.getDay(), 1);
    assert.equal(isWithinSchedule(weekday, mondayNoon), true);

    const mondayEvening = new Date(mondayNoon);
    mondayEvening.setHours(18, 0, 0, 0);
    assert.equal(isWithinSchedule(weekday, mondayEvening), false);

    const tuesdayNoon = new Date(mondayNoon);
    tuesdayNoon.setDate(tuesdayNoon.getDate() + 1);
    assert.equal(tuesdayNoon.getDay(), 2);
    assert.equal(isWithinSchedule(weekday, tuesdayNoon), false);

    const wednesdayNight = new Date(mondayNoon);
    wednesdayNight.setDate(wednesdayNight.getDate() + 2);
    wednesdayNight.setHours(23, 0, 0, 0);
    assert.equal(wednesdayNight.getDay(), 3);
    assert.equal(isWithinSchedule(weekday, wednesdayNight), true);

    const thursdayDawn = new Date(wednesdayNight);
    thursdayDawn.setDate(thursdayDawn.getDate() + 1);
    thursdayDawn.setHours(5, 0, 0, 0);
    assert.equal(isWithinSchedule(weekday, thursdayDawn), true);
  });
});

describe("evaluateGeofence", () => {
  it("alerts only when scheduled, consented place exists, and distance exceeds radius", () => {
    const school = { lat: 45.4765, lon: -75.7013 };
    const far = { lat: 45.4765, lon: -75.9 };
    const km = distanceKm(school.lat, school.lon, far.lat, far.lon);
    assert.ok(km > 10);

    const monday = new Date();
    monday.setHours(12, 0, 0, 0);
    while (monday.getDay() !== 1) monday.setDate(monday.getDate() + 1);

    const input = {
      schedule: defaultSchedule(),
      placeLat: school.lat,
      placeLon: school.lon,
      radiusKm: 10 as const,
    };
    const outside = evaluateGeofence(input, far.lat, far.lon, monday);
    assert.equal(outside.scheduled, true);
    assert.equal(outside.hasPlace, true);
    assert.equal(outside.outside, true);
    assert.equal(outside.shouldAlert, true);

    const inside = evaluateGeofence(input, school.lat + 0.001, school.lon, monday);
    assert.equal(inside.outside, false);
    assert.equal(inside.shouldAlert, false);

    const noPlace = evaluateGeofence(
      { ...input, placeLat: null, placeLon: null },
      far.lat,
      far.lon,
      monday,
    );
    assert.equal(noPlace.hasPlace, false);
    assert.equal(noPlace.shouldAlert, false);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(12, 0, 0, 0);
    const weekendOff = evaluateGeofence(
      {
        ...input,
        schedule: { ...defaultSchedule(), dim: { enabled: false, start: "08:00", end: "18:00" } },
      },
      far.lat,
      far.lon,
      sunday,
    );
    assert.equal(weekendOff.scheduled, false);
    assert.equal(weekendOff.shouldAlert, false);
  });
});

describe("invite token and legacy alerts", () => {
  it("builds a Pages invite URL and sanitizes ?alerte=", () => {
    const token = createAlertToken(() => new Uint8Array(10).fill(3));
    assert.match(token, /^alr-[a-z0-9]{10}$/);
    assert.equal(sanitizeAlertToken("ALR-ABCDEFGHJK"), "alr-abcdefghjk");
    assert.equal(sanitizeAlertToken("javascript:alert(1)"), "");
    assert.equal(sanitizeAlertToken("icloud-password"), "");
    const url = publicAlertInviteUrl("alr-abcdefghjk");
    assert.equal(url, "https://maraudeurx-arch.github.io/xsnow/alertes/?alerte=alr-abcdefghjk");
    assert.equal(parseAlertInviteSearch("?alerte=alr-abcdefghjk&lang=fr"), "alr-abcdefghjk");
    assert.equal(parseAlertInviteSearch("?invite=ami"), "");
  });

  it("migrates the old Zone shape (Prénom / Lien / Endroit / radius text)", () => {
    const legacy = parseStoredAlert({
      id: "abc123xyz",
      person: "Léo",
      relation: "enfant",
      place: "École de l’Île",
      radius: "200 m",
    });
    assert.ok(legacy);
    assert.equal(legacy.person, "Léo");
    assert.equal(legacy.relation, "enfant");
    assert.equal(legacy.place, "École de l’Île");
    assert.equal(legacy.radiusKm, 5);
    assert.equal(legacy.consent, "pending");
    assert.match(legacy.token, /^alr-/);
    assert.equal(legacy.guardianPhone, "");
  });

  it("drops Apple ID / credential-looking names and requires a place", () => {
    assert.equal(alertFromForm({ person: "", relation: "enfant", place: "École", radiusKm: 5 }), null);
    assert.equal(alertFromForm({ person: "Léo", relation: "enfant", place: "", radiusKm: 10 }), null);
    const ok = alertFromForm(
      {
        person: "Léo",
        relation: "conjoint",
        place: "Maison",
        radiusKm: 20,
        guardianPhone: "819-555-0100",
        guardianEmail: "tuteur@exemple.ca",
        placeLat: 45.5,
        placeLon: -75.7,
      },
      () => "2026-09-16T12:00:00.000Z",
      () => "id-1",
      () => "alr-testhost1",
    );
    assert.ok(ok);
    assert.equal(ok.radiusKm, 20);
    assert.equal(ok.consent, "pending");
    assert.match(ok.guardianPhone, /819/);
    assert.equal(ok.guardianEmail, "tuteur@exemple.ca");
    const granted = applyConsent(ok, "granted", "2026-09-16T13:00:00.000Z");
    assert.equal(granted.consent, "granted");
    const pinged = applyPing(granted, {
      scheduled: true,
      hasPlace: true,
      distanceKm: 12,
      outside: true,
      shouldAlert: true,
    });
    assert.equal(pinged.lastOutside, true);
    assert.equal(shareFromAlert(granted).token, "alr-testhost1");
    assert.deepEqual(enabledDaysSummary(ok.schedule), WEEKDAYS);
  });
});

describe("toE164", () => {
  it("assumes +1 for 10-digit Canadian numbers", () => {
    assert.equal(toE164("819-555-0100"), "+18195550100");
    assert.equal(toE164("+1 819 555 0100"), "+18195550100");
    assert.equal(toE164("apple-id"), "");
    assert.equal(toE164(""), "");
  });
});

"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { copyText } from "@/lib/offers";
import { postAlertConsent, postAlertPing, postAlertRegister, fetchAlertInvite } from "@/lib/alert-relay";
import {
  ALERTS_KEY,
  ALERT_NOTICES_KEY,
  ALERT_RADII_KM,
  ALERT_SHARES_KEY,
  PING_INTERVAL_MS,
  WEEKDAYS,
  alertFromForm,
  applyConsent,
  applyPing,
  defaultSchedule,
  enabledDaysSummary,
  evaluateGeofence,
  invitePreviewFromAlert,
  noticeFromResult,
  parseAlertInviteSearch,
  parseStoredAlert,
  parseStoredNotice,
  parseStoredShare,
  prependNotice,
  publicAlertInviteUrl,
  shareFromAlert,
  withPlaceCoords,
  type AlertInvitePreview,
  type AlertNotice,
  type AlertShare,
  type DayWindow,
  type GeofenceResult,
  type ProximityAlert,
  type WeeklySchedule,
  type Weekday,
} from "@/lib/proximity-alerts";
import { useHasHydrated } from "@/lib/useAnalyticsConsent";
import { useStoredList } from "@/lib/useStoredList";

const fieldClass =
  "tap rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal outline-none focus:border-gold";

function readGps(): Promise<{ lat: number; lon: number } | "denied" | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve("unsupported");
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => resolve(err.code === 1 ? "denied" : "unsupported"),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 30_000 },
    );
  });
}

function relationLabel(
  relation: ProximityAlert["relation"],
  copy: { child: string; partner: string; grandparents: string; other: string },
) {
  if (relation === "enfant") return copy.child;
  if (relation === "conjoint") return copy.partner;
  if (relation === "grands-parents") return copy.grandparents;
  return copy.other;
}

export function AlertBoard() {
  const { m } = useI18n();
  const copy = m.alerts;
  const copyRef = useRef(copy);
  copyRef.current = copy;
  const hydrated = useHasHydrated();
  const [rawAlerts, setRawAlerts] = useStoredList<unknown>(ALERTS_KEY);
  const [rawShares, setRawShares] = useStoredList<unknown>(ALERT_SHARES_KEY);
  const [rawNotices, setRawNotices] = useStoredList<unknown>(ALERT_NOTICES_KEY);
  const [schedule, setSchedule] = useState<WeeklySchedule>(defaultSchedule);
  const [placeLat, setPlaceLat] = useState<number | null>(null);
  const [placeLon, setPlaceLon] = useState<number | null>(null);
  const [placeStatus, setPlaceStatus] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState("");
  const [remotePreview, setRemotePreview] = useState<AlertInvitePreview | null>(null);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<string>("");

  const items = useMemo(
    () => rawAlerts.map(parseStoredAlert).filter((item): item is ProximityAlert => Boolean(item)),
    [rawAlerts],
  );
  const shares = useMemo(
    () => rawShares.map(parseStoredShare).filter((item): item is AlertShare => Boolean(item)),
    [rawShares],
  );
  const notices = useMemo(
    () => rawNotices.map(parseStoredNotice).filter((item): item is AlertNotice => Boolean(item)),
    [rawNotices],
  );
  const itemsRef = useRef(items);
  const sharesRef = useRef(shares);
  const noticesRef = useRef(notices);
  itemsRef.current = items;
  sharesRef.current = shares;
  noticesRef.current = notices;

  useEffect(() => {
    setInviteToken(parseAlertInviteSearch(window.location.search));
  }, []);

  useEffect(() => {
    if (!inviteToken) return;
    const local = items.find((item) => item.token === inviteToken);
    if (local) {
      setRemotePreview(invitePreviewFromAlert(local));
      return;
    }
    let cancelled = false;
    void fetchAlertInvite(inviteToken).then((preview) => {
      if (!cancelled && preview) setRemotePreview(preview);
    });
    return () => {
      cancelled = true;
    };
  }, [inviteToken, items]);

  const saveAlerts = useCallback(
    (next: ProximityAlert[]) => {
      setRawAlerts(next);
    },
    [setRawAlerts],
  );

  const recordNotice = useCallback(
    (share: { token: string; person: string; place: string }, result: GeofenceResult) => {
      const notice = noticeFromResult(share, result);
      if (!notice) return;
      setRawNotices(prependNotice(noticesRef.current, notice));
    },
    [setRawNotices],
  );

  const pingShare = useCallback(
    async (share: AlertShare, coords: { lat: number; lon: number }) => {
      const updatedShare =
        share.placeLat == null ? withPlaceCoords(share, coords.lat, coords.lon) : share;
      const evaluated = evaluateGeofence(updatedShare, coords.lat, coords.lon);
      setRawShares(
        sharesRef.current.map((item) => (item.token === share.token ? { ...item, ...updatedShare } : item)),
      );
      saveAlerts(
        itemsRef.current.map((item) =>
          item.token === share.token
            ? applyPing(
                item.placeLat == null ? withPlaceCoords(item, coords.lat, coords.lon) : item,
                evaluated,
              )
            : item,
        ),
      );
      recordNotice(updatedShare, evaluated);
      const relay = await postAlertPing({ token: share.token, lat: coords.lat, lon: coords.lon });
      const labels = copyRef.current;
      const km = evaluated.distanceKm != null ? String(evaluated.distanceKm) : "?";
      if (evaluated.shouldAlert) {
        setPingStatus(
          interpolate(labels.pingOutside, { person: share.person, km, radius: String(share.radiusKm) }),
        );
      } else if (!evaluated.scheduled) {
        setPingStatus(labels.pingUnscheduled);
      } else if (!evaluated.hasPlace) {
        setPingStatus(labels.pingNoPlace);
      } else {
        setPingStatus(interpolate(labels.pingInside, { person: share.person, km }));
      }
      if (relay.payload?.sms?.reason) {
        setPingStatus((prev) =>
          `${prev ?? labels.pingOk} ${interpolate(labels.smsSoft, { status: relay.payload?.sms?.reason || "" })}`.trim(),
        );
      }
    },
    [recordNotice, saveAlerts, setRawShares],
  );

  useEffect(() => {
    if (!shares.length) return;
    let cancelled = false;
    async function tick() {
      if (cancelled || document.visibilityState === "hidden") return;
      const gps = await readGps();
      if (cancelled || gps === "denied" || gps === "unsupported") return;
      for (const share of sharesRef.current) {
        await pingShare(share, gps);
      }
    }
    void tick();
    const id = window.setInterval(() => void tick(), PING_INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pingShare, shares.length]);

  const preview = remotePreview;
  const alreadySharing = Boolean(inviteToken && shares.some((item) => item.token === inviteToken));
  const showConsent = Boolean(hydrated && inviteToken && preview && !alreadySharing && preview.consent !== "denied");

  function patchDay(day: Weekday, patch: Partial<DayWindow>) {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  async function capturePlace() {
    const gps = await readGps();
    if (gps === "unsupported") {
      setPlaceStatus(copy.pingUnsupported);
      return;
    }
    if (gps === "denied") {
      setPlaceStatus(copy.pingDenied);
      return;
    }
    setPlaceLat(gps.lat);
    setPlaceLon(gps.lon);
    setPlaceStatus(
      interpolate(copy.placeCaptured, { lat: gps.lat.toFixed(3), lon: gps.lon.toFixed(3) }),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = alertFromForm({
      person: String(data.get("person") || ""),
      relation: String(data.get("relation") || ""),
      place: String(data.get("place") || ""),
      radiusKm: String(data.get("radiusKm") || "5"),
      schedule,
      guardianPhone: String(data.get("phone") || ""),
      guardianEmail: String(data.get("email") || ""),
      placeLat,
      placeLon,
    });
    if (!next) return;
    saveAlerts([next, ...items]);
    void postAlertRegister({
      token: next.token,
      person: next.person,
      place: next.place,
      placeLat: next.placeLat,
      placeLon: next.placeLon,
      radiusKm: next.radiusKm,
      schedule: next.schedule,
      phone: next.guardianPhone,
      email: next.guardianEmail,
    });
    event.currentTarget.reset();
    setSchedule(defaultSchedule());
    setPlaceLat(null);
    setPlaceLon(null);
    setPlaceStatus(null);
  }

  async function acceptInvite(setOrigin: boolean) {
    if (!preview) return;
    const gps = await readGps();
    if (gps === "unsupported") {
      setPingStatus(copy.pingUnsupported);
      return;
    }
    if (gps === "denied") {
      setPingStatus(copy.consentNeedGps);
      return;
    }
    const origin =
      setOrigin || preview.placeLat == null
        ? { lat: gps.lat, lon: gps.lon }
        : { lat: preview.placeLat, lon: preview.placeLon ?? gps.lon };
    const acceptedAt = new Date().toISOString();
    const local = items.find((item) => item.token === preview.token);
    const granted = local
      ? applyConsent(
          local.placeLat == null ? withPlaceCoords(local, origin.lat, origin.lon) : local,
          "granted",
          acceptedAt,
        )
      : null;
    if (granted) saveAlerts(items.map((item) => (item.token === granted.token ? granted : item)));
    const share = shareFromAlert(
      granted ?? {
        id: preview.token,
        token: preview.token,
        person: preview.person,
        relation: "autre",
        place: preview.place,
        placeLat: origin.lat,
        placeLon: origin.lon,
        radiusKm: preview.radiusKm,
        schedule: preview.schedule,
        guardianPhone: "",
        guardianEmail: "",
        consent: "granted",
        consentedAt: acceptedAt,
        lastPingAt: null,
        lastDistanceKm: null,
        lastOutside: null,
        createdAt: acceptedAt,
      },
      acceptedAt,
    );
    const withOrigin = withPlaceCoords(share, origin.lat, origin.lon);
    setRawShares([withOrigin, ...shares.filter((item) => item.token !== share.token)]);
    void postAlertConsent({
      token: preview.token,
      granted: true,
      placeLat: origin.lat,
      placeLon: origin.lon,
    });
    await pingShare(withOrigin, gps);
  }

  function refuseInvite() {
    if (!preview) return;
    saveAlerts(
      items.map((item) => (item.token === preview.token ? applyConsent(item, "denied") : item)),
    );
    void postAlertConsent({ token: preview.token, granted: false });
    setInviteToken("");
    setRemotePreview(null);
  }

  async function copyInvite(token: string, person: string) {
    const url = publicAlertInviteUrl(token);
    const blurb = interpolate(copy.inviteBlurb, { person, url });
    const ok = await copyText(blurb);
    setCopied(ok ? token : `fail-${token}`);
  }

  return (
    <div className="space-y-5" data-alert-board>
      <p className="text-sm leading-relaxed text-ice/90">{copy.honestLead}</p>
      <p className="text-xs leading-relaxed text-snow/70">{copy.honestIos}</p>

      {showConsent && preview ? (
        <section
          className="space-y-3 rounded-2xl border border-gold/40 bg-gold/10 p-3"
          data-alert-consent
        >
          <p className="font-extrabold text-gold">{copy.consentTitle}</p>
          <p className="text-sm leading-relaxed text-snow/90">
            {interpolate(copy.consentLead, {
              person: preview.person,
              place: preview.place,
              radius: String(preview.radiusKm),
            })}
          </p>
          <button
            type="button"
            className="tap w-full rounded-full bg-cobalt font-extrabold text-snow"
            onClick={() => void acceptInvite(false)}
          >
            {copy.consentAccept}
          </button>
          <button
            type="button"
            className="tap w-full rounded-full border border-white/20 bg-white/5 text-sm font-bold"
            onClick={() => void acceptInvite(true)}
          >
            {copy.setPlaceHere}
          </button>
          <button
            type="button"
            className="tap w-full rounded-full border border-white/20 text-sm font-semibold text-snow/80"
            onClick={refuseInvite}
          >
            {copy.consentRefuse}
          </button>
        </section>
      ) : null}

      {shares.map((share) => (
        <p key={share.token} className="text-xs font-semibold text-gold">
          {interpolate(copy.sharingAs, { person: share.person })}
        </p>
      ))}

      {pingStatus ? (
        <p className="text-sm font-semibold text-gold" role="status">
          {pingStatus}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-3" data-alert-form>
        <Input name="person" label={copy.person} required />
        <label className="grid gap-1 text-sm font-semibold">
          {copy.relation}
          <select
            name="relation"
            className={fieldClass}
            defaultValue="enfant"
          >
            <option value="enfant">{copy.child}</option>
            <option value="conjoint">{copy.partner}</option>
            <option value="grands-parents">{copy.grandparents}</option>
            <option value="autre">{copy.other}</option>
          </select>
        </label>
        <Input name="place" label={copy.place} required />
        <button
          type="button"
          className="tap rounded-full border border-white/20 bg-white/5 text-sm font-bold"
          onClick={() => void capturePlace()}
        >
          {copy.capturePlace}
        </button>
        <p className="text-xs text-snow/70">{placeStatus || copy.placeMissing}</p>
        <label className="grid gap-1 text-sm font-semibold">
          {copy.radius}
          <select name="radiusKm" className={fieldClass} defaultValue="5">
            {ALERT_RADII_KM.map((km) => (
              <option key={km} value={km}>
                {km === 5 ? copy.radius5 : km === 10 ? copy.radius10 : copy.radius20}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <legend className="px-1 text-sm font-semibold">{copy.schedule}</legend>
          {WEEKDAYS.map((day) => (
            <div key={day} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 text-xs">
              <label className="flex min-h-11 items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={schedule[day].enabled}
                  onChange={(event) => patchDay(day, { enabled: event.target.checked })}
                />
                {copy.days[day]}
              </label>
              <label className="grid gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-snow/50">{copy.start}</span>
                <input
                  type="time"
                  value={schedule[day].start}
                  onChange={(event) => patchDay(day, { start: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-snow/50">{copy.end}</span>
                <input
                  type="time"
                  value={schedule[day].end}
                  onChange={(event) => patchDay(day, { end: event.target.value })}
                  className={fieldClass}
                />
              </label>
            </div>
          ))}
        </fieldset>
        <Input name="phone" label={copy.phone} placeholder={copy.phonePh} />
        <Input name="email" label={copy.email} placeholder={copy.emailPh} />
        <p className="text-xs leading-relaxed text-snow/70">{copy.notifyHint}</p>
        <button type="submit" className="tap rounded-full bg-cobalt font-extrabold text-snow">
          {copy.submit}
        </button>
      </form>

      {notices.length ? (
        <section className="space-y-2">
          <p className="text-sm font-extrabold text-gold">{copy.noticesTitle}</p>
          <ul className="space-y-1">
            {notices.map((notice) => (
              <li key={notice.id} className="rounded-xl border border-gold/20 bg-gold/5 px-3 py-2 text-sm">
                {interpolate(copy.noticeLine, {
                  person: notice.person,
                  km: String(notice.distanceKm),
                  place: notice.place,
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="space-y-2">
        {items.map((item) => {
          const url = hydrated ? publicAlertInviteUrl(item.token) : "";
          const days = enabledDaysSummary(item.schedule)
            .map((day) => copy.days[day])
            .join(", ");
          const first = item.schedule[enabledDaysSummary(item.schedule)[0] ?? "lun"];
          const status =
            item.consent === "granted"
              ? copy.consentGranted
              : item.consent === "denied"
                ? copy.consentDenied
                : copy.consentPending;
          return (
            <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3" data-alert-card>
              <p className="font-bold">
                {item.person}{" "}
                <span className="text-xs font-semibold uppercase tracking-wide text-gold">
                  {relationLabel(item.relation, copy)}
                </span>
              </p>
              <p className="text-sm text-snow/80">
                {interpolate(copy.zone, { place: item.place })}
                {` · ${item.radiusKm} km`}
              </p>
              <p className="text-xs text-snow/70">
                {interpolate(copy.hoursSummary, {
                  days: days || "—",
                  start: first.start,
                  end: first.end,
                })}
              </p>
              <p className="mt-1 text-xs font-semibold text-gold">{status}</p>
              {item.lastDistanceKm != null ? (
                <p className="text-xs text-snow/70">
                  {interpolate(copy.lastPing, { km: String(item.lastDistanceKm) })}
                </p>
              ) : null}
              <p className="mt-2 text-[11px] font-semibold text-snow/60">{copy.inviteLabel}</p>
              <p
                className="break-all rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold"
                data-alert-invite-url
              >
                {url}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="tap rounded-full bg-gold text-sm font-extrabold text-night"
                  onClick={() => void copyInvite(item.token, item.person)}
                >
                  {copy.copyInvite}
                </button>
                <button
                  type="button"
                  className="tap rounded-full border border-white/20 bg-white/5 text-sm font-bold"
                  onClick={() => saveAlerts(items.filter((row) => row.id !== item.id))}
                >
                  {copy.remove}
                </button>
              </div>
              {copied === item.token ? (
                <p className="mt-1 text-xs font-semibold text-gold">{copy.inviteCopied}</p>
              ) : null}
              {copied === `fail-${item.token}` ? (
                <p className="mt-1 text-xs font-semibold text-gold">{copy.inviteFailed}</p>
              ) : null}
              {shares.some((share) => share.token === item.token) ? (
                <button
                  type="button"
                  className="tap mt-2 w-full rounded-full border border-cobalt/50 bg-cobalt/20 text-sm font-bold"
                  onClick={async () => {
                    const gps = await readGps();
                    if (gps === "denied") setPingStatus(copy.pingDenied);
                    else if (gps === "unsupported") setPingStatus(copy.pingUnsupported);
                    else {
                      const share = shares.find((row) => row.token === item.token);
                      if (share) await pingShare(share, gps);
                    }
                  }}
                >
                  {copy.checkNow}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Input({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className={fieldClass}
      />
    </label>
  );
}

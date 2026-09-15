"use client";

import { FormEvent, useMemo, useState } from "react";
import { noteOfferCreated } from "@/lib/analytics";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import {
  OFFERS_KEY,
  canPublish,
  carMorningDefaults,
  copyText,
  formatCad,
  formatHourFr,
  formFromOffer,
  offerFromForm,
  publishIssues,
  sharePostFr,
  type CommunityOffer,
  type OfferFormInput,
} from "@/lib/offers";
import { useStoredList } from "@/lib/useStoredList";

const fieldClass =
  "tap rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal text-snow outline-none focus:border-gold";

export function MyServicesBoard() {
  const { locale, m } = useI18n();
  const copy = m.offers;
  const [items, setItems] = useStoredList<CommunityOffer>(OFFERS_KEY);
  const [form, setForm] = useState<OfferFormInput>(() => carMorningDefaults());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [shareText, setShareText] = useState("");
  const [shareStatus, setShareStatus] = useState<"ok" | "fail" | "">("");

  const editing = useMemo(
    () => items.find((item) => item.id === editingId) ?? null,
    [editingId, items],
  );

  function patch<K extends keyof OfferFormInput>(key: K, value: OfferFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError("");
  }

  async function shareOffer(offer: CommunityOffer) {
    const text = sharePostFr(offer);
    setShareText(text);
    const ok = await copyText(text);
    setShareStatus(ok ? "ok" : "fail");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issues = publishIssues(form);
    if (issues.includes("interac")) {
      setError(copy.needInterac);
      return;
    }
    if (issues.includes("insurance")) {
      setError(copy.needInsurance);
      return;
    }
    if (issues.includes("gas")) {
      setError(copy.needGas);
      return;
    }
    if (!canPublish(form)) return;

    const next = offerFromForm(form, editing ?? undefined);
    const existed = items.some((item) => item.id === next.id);
    setItems(existed ? items.map((item) => (item.id === next.id ? next : item)) : [next, ...items]);
    setSaved(true);
    setError("");
    setEditingId(null);
    setForm(carMorningDefaults());
    void shareOffer(next);
    if (!existed) noteOfferCreated(next.kind);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="grid gap-3">
        <h3 className="text-base font-extrabold text-gold">
          {editing ? copy.formTitleEdit : copy.formTitleNew}
        </h3>

        <label className="grid gap-1 text-sm font-semibold">
          {copy.typeLabel}
          <select name="kind" defaultValue="car_morning" className={fieldClass}>
            <option value="car_morning">{copy.typeCarMorning}</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-semibold">
          {copy.title}
          <input
            value={form.title}
            onChange={(event) => patch("title", event.target.value)}
            className={fieldClass}
            required
            autoComplete="off"
          />
        </label>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">{copy.window}</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-semibold">
              {copy.windowFrom}
              <input
                type="time"
                value={form.windowFrom}
                onChange={(event) => patch("windowFrom", event.target.value)}
                className={fieldClass}
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {copy.windowTo}
              <input
                type="time"
                value={form.windowTo}
                onChange={(event) => patch("windowTo", event.target.value)}
                className={fieldClass}
                required
              />
            </label>
          </div>
          <p className="text-xs text-ice/80">{copy.earlierNote}</p>
        </fieldset>

        <label className="grid gap-1 text-sm font-semibold">
          {copy.price}
          <input
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={form.priceCad}
            onChange={(event) => patch("priceCad", event.target.value)}
            className={fieldClass}
            required
          />
        </label>

        <label className="tap flex items-start gap-3 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.gasBorrowerPays}
            onChange={(event) => patch("gasBorrowerPays", event.target.checked)}
            className="mt-1 size-5 accent-gold"
            required
          />
          <span>
            {copy.gasLabel}
            <span className="mt-0.5 block text-xs font-normal text-ice/80">{copy.gasHint}</span>
          </span>
        </label>

        <label className="grid gap-1 text-sm font-semibold">
          {copy.neighborhood}
          <input
            value={form.neighborhood}
            onChange={(event) => patch("neighborhood", event.target.value)}
            placeholder={copy.neighborhoodPh}
            className={fieldClass}
            autoComplete="address-level2"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold">
          {copy.interac}
          <input
            value={form.interacContact}
            onChange={(event) => patch("interacContact", event.target.value)}
            placeholder={copy.interacPh}
            className={fieldClass}
            autoComplete="email"
            inputMode="email"
            required
          />
          <span className="text-xs font-normal text-ice/80">{copy.interacHint}</span>
        </label>

        <label className="grid gap-1 text-sm font-semibold">
          {copy.paypal}
          <input
            value={form.paypalMe}
            onChange={(event) => patch("paypalMe", event.target.value)}
            placeholder={copy.paypalPh}
            className={fieldClass}
            autoComplete="off"
          />
        </label>

        <label className="tap flex items-start gap-3 rounded-2xl border border-gold/35 bg-gold/5 px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.insuranceOk}
            onChange={(event) => patch("insuranceOk", event.target.checked)}
            className="mt-1 size-5 accent-gold"
            required
          />
          <span>
            {copy.insuranceLabel}
            <span className="mt-0.5 block text-xs font-normal leading-relaxed text-gold/90">
              {copy.insuranceHint}
            </span>
          </span>
        </label>

        <label className="grid gap-1 text-sm font-semibold">
          {copy.notes}
          <textarea
            value={form.notes}
            onChange={(event) => patch("notes", event.target.value)}
            rows={3}
            placeholder={copy.notesPh}
            className={`${fieldClass} min-h-[88px] py-2`}
          />
        </label>

        <p className="text-xs leading-relaxed text-snow/70">{copy.terms}</p>

        {error ? <p className="text-sm text-gold">{error}</p> : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <button type="submit" className="tap rounded-full bg-cobalt font-extrabold text-snow">
            {editing ? copy.save : copy.publish}
          </button>
          {editing ? (
            <button
              type="button"
              className="tap rounded-full border border-white/20 bg-white/5 font-bold text-snow"
              onClick={() => {
                setEditingId(null);
                setForm(carMorningDefaults());
                setSaved(false);
                setError("");
              }}
            >
              {copy.cancelEdit}
            </button>
          ) : null}
        </div>
        {saved ? <p className="text-sm text-gold">{m.services.saved}</p> : null}
      </form>

      <section className="space-y-3">
        <h3 className="text-base font-extrabold">{copy.listTitle}</h3>
        {items.length === 0 ? (
          <p className="text-sm text-snow/60">{copy.emptyList}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {item.published ? (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-gold">
                      {copy.published}
                    </span>
                  ) : null}
                  <p className="font-bold">{item.title}</p>
                </div>
                <p className="mt-1 text-xs text-ice/80">
                  {interpolate(copy.windowLine, {
                    from: formatHourFr(item.windowFrom),
                    to: formatHourFr(item.windowTo),
                  })}{" "}
                  · {formatCad(item.priceCad, locale)} {copy.perMorning}
                  {item.neighborhood ? ` · ${item.neighborhood}` : ""}
                </p>
                {item.notes ? (
                  <p className="mt-1 text-sm leading-relaxed text-snow/80">{item.notes}</p>
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="tap rounded-full border border-white/20 bg-white/5 text-sm font-bold"
                    onClick={() => {
                      setEditingId(item.id);
                      setForm(formFromOffer(item));
                      setSaved(false);
                      setShareStatus("");
                    }}
                  >
                    {copy.edit}
                  </button>
                  <button
                    type="button"
                    className="tap rounded-full bg-gold text-sm font-extrabold text-night"
                    onClick={() => void shareOffer(item)}
                  >
                    {copy.share}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {shareText ? (
        <section className="space-y-2 rounded-2xl border border-gold/30 bg-gold/5 p-3">
          <p className="text-sm font-bold text-gold">
            {shareStatus === "ok" ? copy.shareCopied : copy.shareFailed}
          </p>
          <textarea
            readOnly
            value={shareText}
            rows={8}
            className={`${fieldClass} min-h-[140px] py-2 text-xs leading-relaxed`}
          />
        </section>
      ) : null}
    </div>
  );
}

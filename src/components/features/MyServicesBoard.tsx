"use client";

import { FormEvent, Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LocalProfileBoard } from "@/components/LocalProfileBoard";
import { noteOfferCreated } from "@/lib/analytics";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n";
import { MES_SERVICE_SHORTCUTS } from "@/lib/board-shortcuts";
import {
  DRAFT_HOTSPOT_ID,
  DRAFT_UX_SESSION_ID,
  OFFERS_KEY,
  canPublish,
  carMorningDefaults,
  copyText,
  defaultsForKind,
  draftShareText,
  draftTemplateId,
  formatCad,
  formatHourFr,
  formFromOffer,
  formKind,
  offerFromForm,
  parseOfferTemplateQuery,
  parseStoredOffer,
  publishIssues,
  unpublishedTemplateOffer,
  writeEditedShareText,
  clipShareText,
  isInjectedSeedId,
  skillsDefaults,
  type CommunityOffer,
  type OfferFormInput,
  type OfferKind,
} from "@/lib/offers";
import { NOTES_TEXT_MAX, SHARE_TEXT_MAX } from "@/lib/sanitize";
import {
  SKILL_IDS,
  WEEKDAYS,
  parseAvailabilityDays,
  parseSkillIds,
  skillsFallbackTitle,
  type SkillId,
  type Weekday,
} from "@/lib/skills";
import { useLocalProfile } from "@/lib/useLocalProfile";
import { useStoredList } from "@/lib/useStoredList";

const fieldClass =
  "tap rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal text-snow outline-none focus:border-gold";

const ctaClass =
  "tap inline-flex min-h-11 w-full items-center justify-center rounded-full border border-gold/65 bg-cobalt px-3 text-center text-sm font-extrabold text-snow";

function kindLabel(kind: OfferKind, copy: Messages["offers"]) {
  if (kind === "hotspot") return copy.typeHotspot;
  if (kind === "ux_session") return copy.typeUxSession;
  if (kind === "skills") return copy.typeSkills;
  return copy.typeCarMorning;
}

function localizedTemplateForm(
  kind: OfferKind,
  copy: Messages["offers"],
  keep?: OfferFormInput,
): OfferFormInput {
  const base = defaultsForKind(kind);
  return {
    ...base,
    neighborhood: keep?.neighborhood || "",
    interacContact: keep?.interacContact || "",
    paypalMe: keep?.paypalMe || "",
    title:
      kind === "hotspot"
        ? copy.templateHotspotTitle
        : kind === "ux_session"
          ? copy.templateUxTitle
          : base.title,
    notes:
      kind === "hotspot"
        ? copy.templateHotspotNotes
        : kind === "ux_session"
          ? copy.templateUxNotes
          : base.notes,
  };
}

export function MyServicesBoard() {
  return (
    <Suspense fallback={null}>
      <MyServicesBoardInner />
    </Suspense>
  );
}

function MyServicesBoardInner() {
  const { locale, m } = useI18n();
  const copy = m.offers;
  const skillsCopy = m.skills;
  const [profile] = useLocalProfile();
  const searchParams = useSearchParams();
  const initialTemplate = parseOfferTemplateQuery(searchParams.get("template"));
  const initialSkills = initialTemplate === "skills" || searchParams.get("template") === "skills";
  const [stored, setItems] = useStoredList<CommunityOffer>(OFFERS_KEY);
  const items = useMemo(
    () =>
      stored
        .map(parseStoredOffer)
        .filter((item): item is CommunityOffer => Boolean(item && !isInjectedSeedId(item.id))),
    [stored],
  );
  const [form, setForm] = useState<OfferFormInput>(() =>
    initialSkills
      ? skillsDefaults()
      : initialTemplate && initialTemplate !== "car_morning"
        ? localizedTemplateForm(initialTemplate, copy)
        : carMorningDefaults(),
  );
  const [editingId, setEditingId] = useState<string | null>(() =>
    initialSkills
      ? null
      : initialTemplate && initialTemplate !== "car_morning"
        ? draftTemplateId(initialTemplate)
        : null,
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [shareText, setShareText] = useState("");
  const [shareOfferId, setShareOfferId] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<"ok" | "fail" | "">("");
  const [firstPublish, setFirstPublish] = useState(false);
  const [showForm, setShowForm] = useState(() => Boolean(initialTemplate) && !initialSkills);
  const [showSkills, setShowSkills] = useState(() => initialSkills);
  const shareBox = useRef<HTMLElement | null>(null);
  const shareArea = useRef<HTMLTextAreaElement | null>(null);

  const editing = useMemo(
    () => items.find((item) => item.id === editingId) ?? null,
    [editingId, items],
  );

  const kind = formKind(form);
  const carKind = kind === "car_morning";

  function patch<K extends keyof OfferFormInput>(key: K, value: OfferFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setDraftSaved(false);
    setError("");
  }

  function upsertItem(next: CommunityOffer, list: CommunityOffer[]) {
    const existed = list.some((item) => item.id === next.id);
    setItems(existed ? list.map((item) => (item.id === next.id ? next : item)) : [next, ...list]);
  }

  function applyTemplate(nextKind: OfferKind, seedDraft: boolean, list = items) {
    if (nextKind === "skills") {
      setForm(skillsDefaults());
      setEditingId(null);
      setSaved(false);
      setDraftSaved(false);
      setError("");
      setShowForm(false);
      setShowSkills(true);
      return;
    }
    setShowSkills(false);
    if (nextKind === "car_morning") {
      setForm((prev) => localizedTemplateForm("car_morning", copy, prev));
      setEditingId(null);
      setSaved(false);
      setDraftSaved(false);
      setError("");
      setShowForm(true);
      return;
    }
    const id = draftTemplateId(nextKind);
    const existing = list.find((item) => item.id === id) ?? null;
    if (existing?.published) {
      setEditingId(existing.id);
      setForm(formFromOffer(existing));
      setSaved(false);
      setDraftSaved(false);
      setError("");
      return;
    }
    const input = localizedTemplateForm(nextKind, copy, form);
    if (seedDraft) {
      const draft = unpublishedTemplateOffer(nextKind, input, existing ?? undefined);
      upsertItem(draft, list);
      setEditingId(draft.id);
      setForm(formFromOffer(draft));
      setDraftSaved(true);
    } else {
      setEditingId(existing?.id ?? id);
      setForm(existing ? formFromOffer(existing) : input);
    }
    setSaved(false);
    setError("");
    setShowForm(true);
  }

  function openShare(offer: CommunityOffer) {
    const text = draftShareText(offer);
    setShareOfferId(offer.id);
    setShareText(text);
    setShareStatus("");
    requestAnimationFrame(() => {
      shareBox.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      shareArea.current?.focus();
    });
  }

  function editShareText(next: string) {
    const clipped = next.slice(0, SHARE_TEXT_MAX);
    setShareText(clipped);
    setShareStatus("");
    if (shareOfferId) writeEditedShareText(shareOfferId, clipped);
  }

  async function copyShare() {
    const ok = await copyText(clipShareText(shareText));
    setShareStatus(ok ? "ok" : "fail");
    if (ok && shareOfferId) writeEditedShareText(shareOfferId, shareText);
  }

  function focusShareEditor() {
    shareArea.current?.focus();
    shareArea.current?.setSelectionRange(0, 0);
    shareBox.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function existingForSave() {
    if (editing) return editing;
    const helperId =
      form.kind === "hotspot" ? DRAFT_HOTSPOT_ID : form.kind === "ux_session" ? DRAFT_UX_SESSION_ID : "";
    return helperId ? (items.find((item) => item.id === helperId) ?? undefined) : undefined;
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
    if (issues.includes("skills")) {
      setError(skillsCopy.needSkill);
      return;
    }
    if (issues.includes("other")) {
      setError(skillsCopy.needOther);
      return;
    }
    if (issues.includes("days")) {
      setError(skillsCopy.needDay);
      return;
    }
    if (!canPublish(form)) return;

    const existing = existingForSave();
    const toSave =
      formKind(form) === "skills"
        ? {
            ...form,
            title: localizedSkillsTitle(form, skillsCopy),
          }
        : form;
    const next = offerFromForm(toSave, existing);
    const existed = items.some((item) => item.id === next.id);
    const isFirstPublish = !existed && items.length === 0;
    upsertItem(next, items);
    setSaved(true);
    setDraftSaved(false);
    setError("");
    setEditingId(null);
    setForm(carMorningDefaults());
    setShowForm(false);
    setShowSkills(false);
    setFirstPublish(isFirstPublish);
    void openShare(next);
    if (!existed) noteOfferCreated(next.kind);
  }

  function onSaveDraft() {
    const existing = existingForSave();
    const kindNow = formKind(form);
    const helper =
      kindNow === "hotspot" || kindNow === "ux_session"
        ? unpublishedTemplateOffer(kindNow, form, existing)
        : { ...offerFromForm(form, existing), published: false };
    upsertItem(helper, items);
    setEditingId(helper.id);
    setForm(formFromOffer(helper));
    setDraftSaved(true);
    setSaved(false);
    setError("");
  }

  const buttonLabel = {
    "lend-car": m.mesServicesButtons.lendCar,
    moving: m.mesServicesButtons.moving,
    babysitting: m.mesServicesButtons.babysitting,
    skills: m.mesServicesButtons.skills,
  } as const;

  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        {MES_SERVICE_SHORTCUTS.map((item) =>
          item.action === "car_morning" || item.action === "skills" ? (
            <button
              key={item.id}
              type="button"
              className={ctaClass}
              onClick={() => applyTemplate(item.action === "skills" ? "skills" : "car_morning", false)}
            >
              {buttonLabel[item.id]}
            </button>
          ) : (
            <Link key={item.id} href={item.href} className={ctaClass}>
              {buttonLabel[item.id]}
            </Link>
          ),
        )}
      </div>

      {showSkills && !profile ? (
        <div className="space-y-3" data-signup-gate>
          <p className="text-sm leading-relaxed text-pretty text-snow/90">{m.register.gateLead}</p>
          <LocalProfileBoard startOpen required />
        </div>
      ) : null}

      {showSkills && profile ? (
        <SkillsOfferForm
          form={form}
          error={error}
          onPatch={patch}
          onCancel={() => {
            setShowSkills(false);
            setError("");
            setForm(carMorningDefaults());
          }}
          onSubmit={onSubmit}
          labels={skillsCopy}
          dayLabels={m.alerts.days}
          windowFromLabel={copy.windowFrom}
          windowToLabel={copy.windowTo}
        />
      ) : null}

      {showForm ? (
      <form onSubmit={onSubmit} className="grid gap-3">
        <h3 className="text-base font-extrabold text-gold">
          {editing ? copy.formTitleEdit : copy.formTitleNew}
        </h3>

        <label className="grid gap-1 text-sm font-semibold">
          {copy.typeLabel}
          <select
            name="kind"
            value={kind}
            onChange={(event) => {
              const next = event.target.value as OfferKind;
              if (next === kind) return;
              applyTemplate(next, false);
            }}
            className={fieldClass}
          >
            <option value="car_morning">{copy.typeCarMorning}</option>
            <option value="hotspot">{copy.typeHotspot}</option>
            <option value="ux_session">{copy.typeUxSession}</option>
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
          {carKind ? copy.price : copy.priceGeneric}
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

        {carKind ? (
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
        ) : null}

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

        {carKind ? (
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
        ) : null}

        <label className="grid gap-1 text-sm font-semibold">
          {copy.notes}
          <textarea
            value={form.notes}
            onChange={(event) => patch("notes", event.target.value)}
            rows={3}
            maxLength={NOTES_TEXT_MAX}
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
          <button
            type="button"
            className="tap rounded-full border border-white/20 bg-white/5 font-bold text-snow"
            onClick={onSaveDraft}
          >
            {copy.saveDraft}
          </button>
          {editing ? (
            <button
              type="button"
              className="tap rounded-full border border-white/20 bg-white/5 font-bold text-snow sm:col-span-2"
              onClick={() => {
                setEditingId(null);
                setForm(carMorningDefaults());
                setSaved(false);
                setDraftSaved(false);
                setError("");
                setShowForm(Boolean(initialTemplate));
              }}
            >
              {copy.cancelEdit}
            </button>
          ) : null}
        </div>
        {saved ? <p className="text-sm text-gold">{m.services.saved}</p> : null}
        {draftSaved ? <p className="text-sm text-gold">{copy.draftSaved}</p> : null}
      </form>
      ) : null}

      {shareText ? (
        <section
          ref={shareBox}
          className="space-y-2 rounded-2xl border border-gold/30 bg-gold/5 p-3"
        >
          <p className="text-sm font-bold text-gold">{copy.shareHint}</p>
          {firstPublish ? (
            <p className="text-sm leading-relaxed text-snow/90">
              {copy.publishSuccess}{" "}
              <Link
                href="/en-demande"
                className="font-extrabold text-gold underline decoration-gold/50 underline-offset-2"
              >
                {copy.publishSuccessLink}
              </Link>
            </p>
          ) : null}
          <textarea
            ref={shareArea}
            value={shareText}
            onChange={(event) => editShareText(event.target.value)}
            rows={8}
            maxLength={SHARE_TEXT_MAX}
            className={`${fieldClass} min-h-[140px] py-2 text-xs leading-relaxed`}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="tap rounded-full border border-white/20 bg-white/5 text-sm font-bold"
              onClick={focusShareEditor}
            >
              {copy.shareEdit}
            </button>
            <button
              type="button"
              className="tap rounded-full bg-gold text-sm font-extrabold text-night"
              onClick={() => void copyShare()}
            >
              {copy.shareCopy}
            </button>
          </div>
          {shareStatus === "ok" ? (
            <p className="text-xs font-semibold text-gold">{copy.shareCopied}</p>
          ) : null}
          {shareStatus === "fail" ? (
            <p className="text-xs font-semibold text-gold">{copy.shareFailed}</p>
          ) : null}
        </section>
      ) : null}

      {items.length > 0 ? (
      <section className="space-y-3">
        <h3 className="text-base font-extrabold">{copy.listTitle}</h3>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {item.published ? (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-gold">
                      {copy.published}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-snow/70">
                      {copy.draft}
                    </span>
                  )}
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-bold text-ice">
                    {kindLabel(item.kind, copy)}
                  </span>
                  <p className="font-bold">{item.title}</p>
                </div>
                <p className="mt-1 text-xs text-ice/80">
                  {interpolate(copy.windowLine, {
                    from: formatHourFr(item.windowFrom),
                    to: formatHourFr(item.windowTo),
                  })}
                  {item.kind === "skills"
                    ? item.availabilityDays?.length
                      ? ` · ${item.availabilityDays.join(", ")}`
                      : ""
                    : ` · ${formatCad(item.priceCad, locale)} ${
                        item.kind === "car_morning" ? copy.perMorning : copy.perSession
                      }`}
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
                      setDraftSaved(false);
                      setShareStatus("");
                      if (item.kind === "skills") {
                        setShowSkills(true);
                        setShowForm(false);
                      } else {
                        setShowSkills(false);
                        setShowForm(true);
                      }
                    }}
                  >
                    {copy.edit}
                  </button>
                  <button
                    type="button"
                    className="tap rounded-full bg-gold text-sm font-extrabold text-night"
                    onClick={() => openShare(item)}
                  >
                    {copy.share}
                  </button>
                </div>
              </li>
            ))}
          </ul>
      </section>
      ) : null}
    </div>
  );
}

function localizedSkillsTitle(form: OfferFormInput, labels: Messages["skills"]) {
  const ids = parseSkillIds(form.skillIds);
  const other = String(form.skillOther || "").trim();
  const map: Record<SkillId, string> = {
    mechanic: labels.mechanic,
    plumber: labels.plumber,
    electrician: labels.electrician,
    driver: labels.driver,
    other: labels.other,
  };
  const parts = ids.map((id) => (id === "other" && other ? other : map[id]));
  return parts.join(", ") || skillsFallbackTitle(ids, other);
}

function SkillsOfferForm({
  form,
  error,
  onPatch,
  onCancel,
  onSubmit,
  labels,
  dayLabels,
  windowFromLabel,
  windowToLabel,
}: {
  form: OfferFormInput;
  error: string;
  onPatch: <K extends keyof OfferFormInput>(key: K, value: OfferFormInput[K]) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  labels: Messages["skills"];
  dayLabels: Messages["alerts"]["days"];
  windowFromLabel: string;
  windowToLabel: string;
}) {
  const selected = new Set(parseSkillIds(form.skillIds));
  const days = new Set(parseAvailabilityDays(form.availabilityDays));

  function toggleSkill(id: SkillId) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onPatch("skillIds", SKILL_IDS.filter((item) => next.has(item)));
  }

  function toggleDay(day: Weekday) {
    const next = new Set(days);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onPatch("availabilityDays", WEEKDAYS.filter((item) => next.has(item)));
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3" data-skills-form>
      <h3 className="text-base font-extrabold text-gold">{labels.formTitle}</h3>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">{labels.skillsLabel}</legend>
        {SKILL_IDS.map((id) => (
          <label
            key={id}
            className="tap flex min-h-11 items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-semibold"
          >
            <input
              type="checkbox"
              checked={selected.has(id)}
              onChange={() => toggleSkill(id)}
              className="size-5 accent-gold"
            />
            {labels[id]}
          </label>
        ))}
        {selected.has("other") ? (
          <label className="grid gap-1 text-sm font-semibold">
            {labels.other}
            <input
              value={form.skillOther || ""}
              onChange={(event) => onPatch("skillOther", event.target.value)}
              placeholder={labels.otherPh}
              className={fieldClass}
              autoComplete="off"
            />
          </label>
        ) : null}
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">{labels.daysLabel}</legend>
        {WEEKDAYS.map((day) => (
          <label
            key={day}
            className="tap flex min-h-11 items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-semibold"
          >
            <input
              type="checkbox"
              checked={days.has(day)}
              onChange={() => toggleDay(day)}
              className="size-5 accent-gold"
            />
            {dayLabels[day]}
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">{labels.hoursLabel}</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-semibold">
            {windowFromLabel}
            <input
              type="time"
              value={form.windowFrom}
              onChange={(event) => onPatch("windowFrom", event.target.value)}
              className={fieldClass}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {windowToLabel}
            <input
              type="time"
              value={form.windowTo}
              onChange={(event) => onPatch("windowTo", event.target.value)}
              className={fieldClass}
              required
            />
          </label>
        </div>
      </fieldset>
      {error ? <p className="text-sm text-gold">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="submit" className="tap rounded-full bg-cobalt font-extrabold text-snow">
          {labels.publish}
        </button>
        <button
          type="button"
          className="tap rounded-full border border-white/20 bg-white/5 font-bold text-snow"
          onClick={onCancel}
        >
          {labels.cancel}
        </button>
      </div>
    </form>
  );
}


"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import {
  defaultShareBlurb,
  publicInviteUrl,
  readOrCreateShareCode,
} from "@/lib/invite";
import {
  EMAIL_TEXT_MAX,
  NAME_TEXT_MAX,
  PHONE_TEXT_MAX,
  defaultRegisterShareBlurb,
  emptyProfileInput,
  inputFromProfile,
  profileFormIssues,
  profileFromForm,
  type LocalProfileInput,
} from "@/lib/local-profile";
import { copyText, clipShareText } from "@/lib/offers";
import { SHARE_TEXT_MAX } from "@/lib/sanitize";
import { useHasHydrated } from "@/lib/useAnalyticsConsent";
import { useLocalProfile } from "@/lib/useLocalProfile";

const fieldClass =
  "tap w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-normal text-snow outline-none focus:border-gold";

const blueCtaClass =
  "tap inline-flex w-full min-h-11 items-center justify-center rounded-full border border-sky-300/80 bg-[#1d4ed8] px-3 text-sm font-extrabold tracking-wide text-snow shadow-[0_8px_24px_rgba(29,78,216,0.5)] hover:brightness-110";

export function LocalProfileBoard() {
  const { locale, m } = useI18n();
  const copy = m.register;
  const hydrated = useHasHydrated();
  const [profile, setProfile] = useLocalProfile();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LocalProfileInput>(emptyProfileInput);
  const [error, setError] = useState<"" | "firstName" | "lastName" | "email" | "phone">("");
  const [shareText, setShareText] = useState("");
  const [shareStatus, setShareStatus] = useState<"ok" | "fail" | "">("");
  const area = useRef<HTMLTextAreaElement | null>(null);

  const code = hydrated ? readOrCreateShareCode() : "opc";
  const url = publicInviteUrl(code);
  const seeded = useMemo(() => {
    if (profile) return defaultRegisterShareBlurb(url, profile.firstName, locale);
    return defaultShareBlurb(url, locale);
  }, [locale, profile, url]);
  const value = shareText || seeded;

  function openForm() {
    setError("");
    setForm(profile ? inputFromProfile(profile) : emptyProfileInput());
    setOpen(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issues = profileFormIssues(form);
    if (issues.length) {
      setError(issues[0]!);
      return;
    }
    const next = profileFromForm(form, profile);
    if (!next) {
      setError("firstName");
      return;
    }
    setProfile(next);
    setShareText(defaultRegisterShareBlurb(url, next.firstName, locale));
    setOpen(false);
    setError("");
  }

  async function copyShare() {
    const ok = await copyText(clipShareText(value));
    setShareStatus(ok ? "ok" : "fail");
  }

  const errorText =
    error === "firstName"
      ? copy.needFirstName
      : error === "lastName"
        ? copy.needLastName
        : error === "email"
          ? copy.invalidEmail
          : error === "phone"
            ? copy.invalidPhone
            : "";

  return (
    <section className="space-y-2 rounded-2xl border border-sky-400/35 bg-sky-500/10 p-3">
      {!profile ? (
        <button type="button" className={blueCtaClass} data-register-cta onClick={openForm}>
          {copy.cta}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-extrabold text-snow">{copy.saved}</p>
          <p className="text-xs font-semibold text-snow/85" data-member-id>
            {copy.memberNumber} {profile.id}
          </p>
          <p className="text-sm font-bold text-snow">
            {profile.firstName} {profile.lastName}
          </p>
          <p className="text-[11px] leading-snug text-ice/80">{copy.memberNumberHint}</p>
          <p className="text-[11px] leading-snug text-ice/80">{copy.localOnly}</p>
          <button type="button" className={blueCtaClass} data-register-cta onClick={openForm}>
            {copy.edit}
          </button>
        </div>
      )}

      {open ? (
        <form className="grid gap-2" onSubmit={onSubmit} data-register-form>
          <p className="text-sm font-extrabold text-snow">{copy.title}</p>
          <p className="text-[11px] leading-snug text-snow/80">{copy.hint}</p>
          <label className="grid gap-1 text-xs font-semibold">
            {copy.firstName}
            <input
              name="firstName"
              value={form.firstName}
              maxLength={NAME_TEXT_MAX}
              autoComplete="given-name"
              className={fieldClass}
              placeholder={copy.firstNamePh}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value.slice(0, NAME_TEXT_MAX) }))}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            {copy.lastName}
            <input
              name="lastName"
              value={form.lastName}
              maxLength={NAME_TEXT_MAX}
              autoComplete="family-name"
              className={fieldClass}
              placeholder={copy.lastNamePh}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value.slice(0, NAME_TEXT_MAX) }))}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            {copy.email}
            <input
              name="email"
              type="email"
              inputMode="email"
              value={form.email}
              maxLength={EMAIL_TEXT_MAX}
              autoComplete="email"
              className={fieldClass}
              placeholder={copy.emailPh}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value.slice(0, EMAIL_TEXT_MAX) }))}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            {copy.phone}
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              maxLength={PHONE_TEXT_MAX}
              autoComplete="tel"
              className={fieldClass}
              placeholder={copy.phonePh}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value.slice(0, PHONE_TEXT_MAX) }))}
            />
          </label>
          {errorText ? (
            <p className="text-xs font-semibold text-gold" role="status">
              {errorText}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="tap rounded-full border border-white/20 bg-white/5 text-sm font-bold"
              onClick={() => setOpen(false)}
            >
              {copy.cancel}
            </button>
            <button type="submit" className={blueCtaClass}>
              {copy.save}
            </button>
          </div>
        </form>
      ) : null}

      {profile && !open ? (
        <div className="space-y-2 border-t border-white/10 pt-2">
          <p className="text-sm font-extrabold text-gold">{copy.shareTitle}</p>
          <p className="text-[11px] leading-snug text-snow/80">{copy.shareHint}</p>
          <textarea
            ref={area}
            value={value}
            onChange={(event) => setShareText(event.target.value.slice(0, SHARE_TEXT_MAX))}
            rows={4}
            maxLength={SHARE_TEXT_MAX}
            className={`${fieldClass} min-h-[88px] text-xs leading-relaxed`}
            aria-label={copy.shareTitle}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="tap rounded-full border border-white/20 bg-white/5 text-sm font-bold"
              onClick={() => {
                area.current?.focus();
                area.current?.select();
              }}
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
          {shareStatus === "ok" ? <p className="text-xs font-semibold text-gold">{copy.shareCopied}</p> : null}
          {shareStatus === "fail" ? <p className="text-xs font-semibold text-gold">{copy.shareFailed}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

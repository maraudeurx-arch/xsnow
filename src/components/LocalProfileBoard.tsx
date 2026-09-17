"use client";

import { FormEvent, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { postRegisterNotice } from "@/lib/idea-inbox";
import {
  EMAIL_TEXT_MAX,
  NAME_TEXT_MAX,
  PHONE_TEXT_MAX,
  emptyProfileInput,
  inputFromProfile,
  profileFormIssues,
  profileFromForm,
  type LocalProfileInput,
} from "@/lib/local-profile";
import { useDeviceMemoryReady } from "@/lib/useDeviceMemoryReady";
import { useLocalProfile } from "@/lib/useLocalProfile";
import { usePlace } from "@/lib/place";

const fieldClass =
  "tap w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-normal text-snow outline-none focus:border-gold";

const blueCtaClass =
  "tap inline-flex w-full min-h-11 items-center justify-center rounded-full border border-sky-300/80 bg-[#1d4ed8] px-3 text-sm font-extrabold tracking-wide text-snow shadow-[0_8px_24px_rgba(29,78,216,0.5)] hover:brightness-110";

export function LocalProfileBoard({
  startOpen = false,
  required = false,
}: {
  startOpen?: boolean;
  required?: boolean;
}) {
  const { m } = useI18n();
  const copy = m.register;
  const memoryReady = useDeviceMemoryReady();
  const { city } = usePlace();
  const [profile, setProfile] = useLocalProfile();
  const [open, setOpen] = useState(startOpen && !profile);
  const [form, setForm] = useState<LocalProfileInput>(emptyProfileInput);
  const [error, setError] = useState<"" | "firstName" | "lastName" | "email" | "phone">("");

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
    setOpen(false);
    setError("");
    void postRegisterNotice({
      firstName: next.firstName,
      opcId: next.id,
      email: next.email,
      city: city || "",
    });
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
      {!profile && !memoryReady ? (
        <div data-device-memory-pending aria-busy="true" className="min-h-11" />
      ) : !profile && !open ? (
        <button type="button" className={blueCtaClass} data-register-cta onClick={openForm}>
          {copy.cta}
        </button>
      ) : profile ? (
        <div className="space-y-2">
          <p className="text-sm font-extrabold text-snow">{copy.saved}</p>
          <p className="text-xs font-semibold text-snow/85" data-member-id>
            {copy.memberNumber} {profile.id}
          </p>
          <p className="text-sm font-bold text-snow">
            {profile.firstName} {profile.lastName}
          </p>
          <button type="button" className={blueCtaClass} data-register-cta onClick={openForm}>
            {copy.edit}
          </button>
        </div>
      ) : null}

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
            {required ? null : (
            <button
              type="button"
              className="tap rounded-full border border-white/20 bg-white/5 text-sm font-bold"
              onClick={() => setOpen(false)}
            >
              {copy.cancel}
            </button>
            )}
            <button type="submit" className={`${blueCtaClass}${required ? " col-span-2" : ""}`}>
              {copy.save}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

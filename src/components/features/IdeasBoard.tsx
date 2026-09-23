"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { noteCommunityIdea, noteIdeaSubmit } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n/locale";
import { readStoredIdeas } from "@/lib/device-memory";
import { postIdeaToInbox } from "@/lib/idea-inbox";
import {
  IDEAS_KEY,
  analyticsSnippet,
  clearIdeaDraft,
  emptyIdeaForm,
  ideaFormIssues,
  ideaFromForm,
  readIdeaDraft,
  type CommunityIdea,
  type IdeaFormInput,
} from "@/lib/ideas";
import { useLocalProfile } from "@/lib/useLocalProfile";
import { usePlace } from "@/lib/place";
import { useStoredList } from "@/lib/useStoredList";

const fieldClass =
  "tap w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-base font-normal text-slate-900 outline-none focus:border-cobalt";

const ctaClass =
  "tap inline-flex min-h-12 w-full items-center justify-center rounded-full border border-transparent bg-cobalt px-3 text-center text-base font-bold text-white shadow-[0_8px_18px_rgba(0,110,253,0.22)]";

function formatIdeaWhen(iso: string, locale: string) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-CA" : locale === "es" ? "es" : "fr-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(time));
  } catch {
    return iso;
  }
}

export function IdeasBoard() {
  const { m, locale } = useI18n();
  const copy = m.ideas;
  const { city } = usePlace();
  const [profile] = useLocalProfile();
  const [items, setStored] = useStoredList<CommunityIdea>(IDEAS_KEY);
  const [form, setForm] = useState<IdeaFormInput>(emptyIdeaForm);
  const [error, setError] = useState(false);
  const [received, setReceived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inbox, setInbox] = useState<CommunityIdea["inbox"]>("local");
  const formRef = useRef<HTMLFormElement | null>(null);
  const textArea = useRef<HTMLTextAreaElement | null>(null);
  const focusAfterReset = useRef(false);

  useEffect(() => {
    const draft = readIdeaDraft();
    if (!draft) return;
    setForm((prev) => ({ ...prev, text: prev.text || draft }));
    clearIdeaDraft();
    window.setTimeout(() => textArea.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#form") {
      window.setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        textArea.current?.focus();
      }, 50);
    }
  }, []);

  useEffect(() => {
    if (received || !focusAfterReset.current) return;
    focusAfterReset.current = false;
    textArea.current?.focus();
  }, [received]);

  function patchList(next: CommunityIdea[]) {
    setStored(next);
  }

  function patchInbox(id: string, nextInbox: CommunityIdea["inbox"]) {
    const latest = readStoredIdeas();
    patchList(latest.map((item) => (item.id === id ? { ...item, inbox: nextInbox } : item)));
    setInbox(nextInbox);
  }

  function patchText(value: string) {
    setForm((prev) => ({ ...prev, text: value }));
    setError(false);
  }

  async function sendInbox(idea: CommunityIdea) {
    // Never send visitor phone/email on idea mail — even if the local profile has them.
    const result = await postIdeaToInbox({
      id: idea.id,
      text: idea.text,
      city: city || "",
      opcId: profile?.id || "",
    });
    patchInbox(idea.id, result);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const issues = ideaFormIssues(form);
    if (issues.length) {
      setError(true);
      return;
    }
    const idea = ideaFromForm(form);
    idea.inbox = "local";
    const latest = readStoredIdeas();
    patchList([idea, ...latest.filter((item) => item.id !== idea.id)]);
    noteCommunityIdea(analyticsSnippet(idea));
    noteIdeaSubmit(idea.involvement.join("+") || "text");
    setForm(emptyIdeaForm());
    setError(false);
    setInbox("local");
    setReceived(true);
    setBusy(true);
    void sendInbox(idea).finally(() => setBusy(false));
  }

  function addAnother() {
    focusAfterReset.current = true;
    setReceived(false);
    setBusy(false);
    setForm(emptyIdeaForm());
    setError(false);
    setInbox("local");
  }

  if (received) {
    return (
      <div className="space-y-3" data-idea-receipt>
        <div role="status" aria-live="polite" className="space-y-3">
          <h3 className="font-[family-name:var(--font-fraunces)] text-xl font-extrabold text-balance text-snow">
            {copy.thankYou}
          </h3>
          <p className="text-sm leading-relaxed text-pretty text-ice/85">{copy.thankYouBody}</p>
          {inbox === "sent" ? (
            <p className="text-sm font-semibold text-gold" data-idea-inbox="sent">
              {copy.inboxSent}
            </p>
          ) : null}
          {inbox === "failed" ? (
            <p className="text-sm font-semibold text-gold" data-idea-inbox="failed">
              {copy.inboxFailed}
            </p>
          ) : null}
        </div>
        <button type="button" className={ctaClass} onClick={addAnother}>
          {copy.newIdea}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form id="form" ref={formRef} className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <div className="space-y-1.5">
          <label htmlFor="idea-text" className="block text-sm font-semibold text-snow">
            {copy.textLabel}
          </label>
          <textarea
            id="idea-text"
            ref={textArea}
            value={form.text}
            onChange={(event) => patchText(event.target.value)}
            placeholder={copy.textPh}
            rows={3}
            maxLength={500}
            required
            className={`${fieldClass} min-h-[72px] py-2 leading-relaxed`}
          />
        </div>
        {copy.submitHint ? (
          <p className="text-base leading-relaxed text-snow/90">{copy.submitHint}</p>
        ) : null}
        {profile ? (
          <p className="text-base leading-relaxed text-snow/85">
            {copy.registeredHint} {profile.id}
          </p>
        ) : (
          <p className="text-base leading-relaxed text-snow/85">
            {copy.registerHint}{" "}
            <Link href="/mon-profil" className="font-semibold text-gold underline-offset-2 hover:underline">
              {copy.registerLink}
            </Link>
          </p>
        )}
        {error ? (
          <p className="text-sm font-semibold text-gold" role="status">
            {copy.textRequired}
          </p>
        ) : null}
        <button type="submit" className={ctaClass} disabled={busy}>
          {copy.submit}
        </button>
      </form>

      <section className="space-y-2" data-idea-wall>
        <h3 className="text-sm font-extrabold text-snow">{copy.wallTitle}</h3>
        <p className="text-base leading-relaxed text-snow/85">{copy.wallHint}</p>
        {items.length === 0 ? (
          <p className="text-base text-snow/85">{copy.wallEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((idea) => (
              <li
                key={idea.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                data-idea-item={idea.id}
              >
                <p className="text-sm leading-relaxed text-snow">{idea.text}</p>
                <p className="mt-1 text-sm text-snow/80">{formatIdeaWhen(idea.createdAt, locale)}</p>
                {idea.inbox === "sent" ? (
                  <p className="mt-1 text-xs font-semibold text-gold" data-idea-inbox="sent">
                    {copy.inboxSent}
                  </p>
                ) : null}
                {idea.inbox === "failed" ? (
                  <p className="mt-1 text-xs font-semibold text-gold" data-idea-inbox="failed">
                    {copy.inboxFailed}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

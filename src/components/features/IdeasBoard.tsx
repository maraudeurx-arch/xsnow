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
  "tap w-full rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal text-snow outline-none focus:border-gold";

const ctaClass =
  "tap inline-flex min-h-11 w-full items-center justify-center rounded-full border border-gold/65 bg-cobalt px-3 text-center text-sm font-extrabold text-snow shadow-[0_10px_28px_rgba(0,0,0,0.55)]";

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
  const [thanks, setThanks] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const textArea = useRef<HTMLTextAreaElement | null>(null);

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

  function patchList(next: CommunityIdea[]) {
    setStored(next);
  }

  function patchInbox(id: string, inbox: CommunityIdea["inbox"]) {
    const latest = readStoredIdeas();
    patchList(latest.map((item) => (item.id === id ? { ...item, inbox } : item)));
  }

  function patchText(value: string) {
    setForm((prev) => ({ ...prev, text: value }));
    setError(false);
  }

  async function sendInbox(idea: CommunityIdea) {
    const result = await postIdeaToInbox({ id: idea.id, text: idea.text, city: city || "" });
    patchInbox(idea.id, result);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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
    setThanks(true);
    setBusy(true);
    try {
      await sendInbox(idea);
    } finally {
      setBusy(false);
    }
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
        <p className="text-xs leading-relaxed text-ice/80">{copy.submitHint}</p>
        {profile ? (
          <p className="text-xs leading-relaxed text-ice/70">
            {copy.registeredHint} {profile.id}
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-ice/70">
            {copy.registerHint}{" "}
            <Link href="/mon-profil" className="font-semibold text-gold underline-offset-2 hover:underline">
              {copy.registerLink}
            </Link>
          </p>
        )}
        {error ? (
          <p className="text-xs font-semibold text-gold" role="status">
            {copy.textRequired}
          </p>
        ) : null}
        <button type="submit" className={ctaClass} disabled={busy}>
          {copy.submit}
        </button>
      </form>

      {thanks ? (
        <div className="space-y-1 rounded-2xl border border-gold/35 bg-gold/10 p-3" role="status" data-idea-thanks>
          <p className="text-sm font-extrabold text-gold">{copy.thankYou}</p>
          <p className="text-xs leading-relaxed text-snow/85">{copy.thankYouBody}</p>
        </div>
      ) : null}

      <section className="space-y-2" data-idea-wall>
        <h3 className="text-sm font-extrabold text-snow">{copy.wallTitle}</h3>
        <p className="text-xs leading-relaxed text-ice/75">{copy.wallHint}</p>
        {items.length === 0 ? (
          <p className="text-xs text-ice/70">{copy.wallEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((idea) => (
              <li
                key={idea.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                data-idea-item={idea.id}
              >
                <p className="text-sm leading-relaxed text-snow">{idea.text}</p>
                <p className="mt-1 text-[11px] text-ice/65">{formatIdeaWhen(idea.createdAt, locale)}</p>
                {idea.inbox === "sent" ? (
                  <p className="mt-1 text-[11px] font-semibold text-gold" data-idea-inbox="sent">
                    {copy.inboxSent}
                  </p>
                ) : null}
                {idea.inbox === "failed" ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2" data-idea-inbox="failed">
                    <p className="text-[11px] font-semibold text-gold">{copy.inboxFailed}</p>
                    <button
                      type="button"
                      className="tap rounded-full border border-white/20 px-2 py-1 text-[11px] font-bold text-snow"
                      onClick={() => void sendInbox(idea)}
                    >
                      {copy.retryInbox}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { noteCommunityIdea, noteIdeaSubmit } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n/locale";
import {
  IDEAS_KEY,
  analyticsSnippet,
  clearIdeaDraft,
  emptyIdeaForm,
  ideaFormIssues,
  ideaFromForm,
  parseStoredIdea,
  readIdeaDraft,
  type CommunityIdea,
  type IdeaFormInput,
} from "@/lib/ideas";
import { useStoredList } from "@/lib/useStoredList";

const fieldClass =
  "tap w-full rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal text-snow outline-none focus:border-gold";

const ctaClass =
  "tap inline-flex min-h-11 w-full items-center justify-center rounded-full border border-gold/65 bg-cobalt px-3 text-center text-sm font-extrabold text-snow shadow-[0_10px_28px_rgba(0,0,0,0.55)]";

export function IdeasBoard() {
  const { m } = useI18n();
  const copy = m.ideas;
  const [stored, setStored] = useStoredList<CommunityIdea>(IDEAS_KEY);
  const items = useMemo(
    () => stored.map(parseStoredIdea).filter((item): item is CommunityIdea => Boolean(item)),
    [stored],
  );
  const [form, setForm] = useState<IdeaFormInput>(emptyIdeaForm);
  const [error, setError] = useState(false);
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

  function patchText(value: string) {
    setForm((prev) => ({ ...prev, text: value }));
    setError(false);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const issues = ideaFormIssues(form);
    if (issues.length) {
      setError(true);
      return;
    }
    const idea = ideaFromForm(form);
    setStored([idea, ...items]);
    noteCommunityIdea(analyticsSnippet(idea));
    noteIdeaSubmit(idea.involvement.join("+") || "text");
    setForm(emptyIdeaForm());
    setError(false);
  }

  return (
    <form id="form" ref={formRef} className="space-y-3" onSubmit={onSubmit}>
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
      {error ? (
        <p className="text-xs font-semibold text-gold" role="status">
          {copy.textRequired}
        </p>
      ) : null}
      <button type="submit" className={ctaClass}>
        {copy.submit}
      </button>
    </form>
  );
}

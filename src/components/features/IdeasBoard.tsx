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
import { usePublicCatalog } from "@/lib/usePublicCatalog";
import { useStoredList } from "@/lib/useStoredList";

const fieldClass =
  "tap w-full rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal text-snow outline-none focus:border-gold";

const ctaClass =
  "tap inline-flex min-h-11 w-full items-center justify-center rounded-full border border-gold/65 bg-cobalt px-3 text-center text-sm font-extrabold text-snow shadow-[0_10px_28px_rgba(0,0,0,0.55)]";

export function IdeasBoard() {
  const { m } = useI18n();
  const copy = m.ideas;
  const catalog = usePublicCatalog();
  const [stored, setStored] = useStoredList<CommunityIdea>(IDEAS_KEY);
  const items = useMemo(
    () => stored.map(parseStoredIdea).filter((item): item is CommunityIdea => Boolean(item)),
    [stored],
  );
  const catalogIdeas = useMemo(
    () => catalog.ideas.filter((idea) => !items.some((item) => item.id === idea.id)),
    [catalog.ideas, items],
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<IdeaFormInput>(emptyIdeaForm);
  const [error, setError] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const textArea = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const draft = readIdeaDraft();
    if (!draft) return;
    setOpen(true);
    setForm((prev) => ({ ...prev, text: prev.text || draft }));
    clearIdeaDraft();
    window.setTimeout(() => textArea.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#form") {
      setOpen(true);
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
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="space-y-3">
        <button type="button" className={ctaClass} onClick={() => setOpen(true)}>
          {copy.openCta}
        </button>
        {items.length || catalogIdeas.length ? (
          <ul className="space-y-2">
            {items.map((idea) => (
              <li
                key={idea.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left"
              >
                <p className="text-sm leading-relaxed text-snow">{idea.text}</p>
              </li>
            ))}
            {catalogIdeas.map((idea) => (
              <li
                key={idea.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left"
              >
                <span className="rounded-full bg-ice/20 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ice">
                  {copy.catalogBadge}
                </span>
                <p className="mt-2 text-sm leading-relaxed text-snow">{idea.text}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form id="form" ref={formRef} className="space-y-3" onSubmit={onSubmit}>
        <textarea
          ref={textArea}
          value={form.text}
          onChange={(event) => patchText(event.target.value)}
          placeholder={copy.textPh}
          rows={3}
          maxLength={500}
          required
          aria-label={copy.textLabel}
          className={`${fieldClass} min-h-[72px] py-2 leading-relaxed`}
        />
        {error ? (
          <p className="text-xs font-semibold text-gold" role="status">
            {copy.textRequired}
          </p>
        ) : null}
        <button type="submit" className={ctaClass}>
          {copy.submit}
        </button>
      </form>

      {items.length || catalogIdeas.length ? (
        <ul className="space-y-2">
          {items.map((idea) => (
            <li
              key={idea.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left"
            >
              <p className="text-sm leading-relaxed text-snow">{idea.text}</p>
            </li>
          ))}
          {catalogIdeas.map((idea) => (
            <li
              key={idea.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left"
            >
              <span className="rounded-full bg-ice/20 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ice">
                {copy.catalogBadge}
              </span>
              <p className="mt-2 text-sm leading-relaxed text-snow">{idea.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

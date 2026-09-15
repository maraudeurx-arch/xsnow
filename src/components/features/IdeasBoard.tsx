"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { noteCommunityIdea } from "@/lib/analytics";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import {
  IDEAS_KEY,
  INVOLVEMENT,
  analyticsSnippet,
  clearIdeaDraft,
  defaultIdeaShareText,
  draftIdeaShareText,
  emptyIdeaForm,
  formFromIdea,
  ideaFormIssues,
  ideaFromForm,
  parseStoredIdea,
  readIdeaDraft,
  toggleInvolvement,
  writeEditedIdeaShare,
  type CommunityIdea,
  type IdeaFormInput,
  type Involvement,
} from "@/lib/ideas";
import { copyText } from "@/lib/offers";
import { useStoredList } from "@/lib/useStoredList";

const fieldClass =
  "tap w-full rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal text-snow outline-none focus:border-gold";

export function IdeasBoard() {
  const { m } = useI18n();
  const copy = m.ideas;
  const [stored, setStored] = useStoredList<CommunityIdea>(IDEAS_KEY);
  const items = useMemo(
    () => stored.map(parseStoredIdea).filter((item): item is CommunityIdea => Boolean(item)),
    [stored],
  );
  const [form, setForm] = useState<IdeaFormInput>(emptyIdeaForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<"" | "text" | "involvement">("");
  const [thanksId, setThanksId] = useState<string | null>(null);
  const [shareText, setShareText] = useState("");
  const [shareStatus, setShareStatus] = useState<"ok" | "fail" | "">("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const shareArea = useRef<HTMLTextAreaElement | null>(null);
  const textArea = useRef<HTMLTextAreaElement | null>(null);

  const shareLabels = useMemo(
    () => ({
      heading: copy.shareHeading,
      involvement: {
        tete: copy.tete,
        coeur: copy.coeur,
        mains: copy.mains,
      } satisfies Record<Involvement, string>,
      hours: copy.hoursShare,
      neighborhood: copy.neighborhoodShare,
    }),
    [copy],
  );

  const thanksIdea = items.find((item) => item.id === thanksId) ?? null;

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
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  function patch<K extends keyof IdeaFormInput>(key: K, value: IdeaFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  }

  function startShare(idea: CommunityIdea, resetShare = false) {
    setThanksId(idea.id);
    setShareText(
      resetShare ? defaultIdeaShareText(idea, shareLabels) : draftIdeaShareText(idea, shareLabels),
    );
    setShareStatus("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const issues = ideaFormIssues(form);
    if (issues.length) {
      setError(issues[0] ?? "text");
      return;
    }
    const existing = items.find((item) => item.id === editingId);
    const idea = ideaFromForm(form, existing);
    const next = existing
      ? items.map((item) => (item.id === idea.id ? idea : item))
      : [idea, ...items];
    setStored(next);
    noteCommunityIdea(analyticsSnippet(idea));
    setForm(emptyIdeaForm());
    setEditingId(null);
    startShare(idea, true);
    window.setTimeout(() => {
      shareArea.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function editIdea(idea: CommunityIdea) {
    setForm(formFromIdea(idea));
    setEditingId(idea.id);
    setThanksId(null);
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => textArea.current?.focus(), 50);
  }

  async function copyShare() {
    const ok = await copyText(shareText);
    setShareStatus(ok ? "ok" : "fail");
    if (ok && thanksIdea) writeEditedIdeaShare(thanksIdea.id, shareText);
  }

  function focusShareEditor() {
    shareArea.current?.focus();
    shareArea.current?.select();
  }

  return (
    <div className="space-y-4">
      <form
        id="form"
        ref={formRef}
        className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
        onSubmit={onSubmit}
      >
        <label className="grid gap-1.5">
          <span className="text-sm font-extrabold text-snow">{copy.textLabel}</span>
          <textarea
            ref={textArea}
            value={form.text}
            onChange={(event) => patch("text", event.target.value)}
            placeholder={copy.textPh}
            rows={2}
            maxLength={500}
            required
            className={`${fieldClass} min-h-[64px] py-2 leading-relaxed`}
          />
        </label>
        {error === "text" ? (
          <p className="text-xs font-semibold text-gold" role="status">
            {copy.textRequired}
          </p>
        ) : null}

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-extrabold text-snow">{copy.involvementLabel}</legend>
          <p className="text-xs leading-relaxed text-ice/80">{copy.involvementHint}</p>
          <div className="grid gap-1.5">
            {INVOLVEMENT.map((key) => {
              const selected = form.involvement.includes(key);
              const hint = key === "tete" ? copy.teteHint : key === "coeur" ? copy.coeurHint : copy.mainsHint;
              const label = copy[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => patch("involvement", toggleInvolvement(form.involvement, key))}
                  className={`tap flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-left ${
                    selected
                      ? "border-gold/70 bg-gold/15 text-gold"
                      : "border-white/15 bg-white/[0.04] text-snow"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-extrabold">{label}</span>
                    <span className="block text-[11px] font-medium text-snow/70">{hint}</span>
                  </span>
                  <span aria-hidden className="text-base font-black">
                    {selected ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {error === "involvement" ? (
          <p className="text-xs font-semibold text-gold" role="status">
            {copy.involvementRequired}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1">
            <span className="text-[11px] font-extrabold text-snow/80">{copy.hoursLabel}</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.hoursPerWeek}
              onChange={(event) => patch("hoursPerWeek", event.target.value)}
              placeholder={copy.hoursPh}
              className={`${fieldClass} min-h-11`}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-extrabold text-snow/80">{copy.neighborhoodLabel}</span>
            <input
              type="text"
              value={form.neighborhood}
              onChange={(event) => patch("neighborhood", event.target.value)}
              placeholder={copy.neighborhoodPh}
              className={`${fieldClass} min-h-11`}
            />
          </label>
        </div>

        <button
          type="submit"
          className="tap sticky bottom-2 z-10 w-full rounded-full bg-cobalt text-sm font-extrabold text-snow shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
        >
          {copy.submit}
        </button>
      </form>

      {thanksIdea ? (
        <section className="space-y-2 rounded-2xl border border-gold/30 bg-gold/5 p-3" aria-live="polite">
          <p className="text-base font-extrabold text-gold">{copy.thankYou}</p>
          <p className="text-sm leading-relaxed text-snow/90">{copy.thankYouBody}</p>
          <p className="text-sm font-bold text-gold">{copy.shareHint}</p>
          <textarea
            ref={shareArea}
            value={shareText}
            onChange={(event) => {
              setShareText(event.target.value);
              writeEditedIdeaShare(thanksIdea.id, event.target.value);
            }}
            rows={6}
            className={`${fieldClass} min-h-[120px] py-2 text-xs leading-relaxed`}
            aria-label={copy.share}
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
          <button
            type="button"
            className="tap w-full rounded-full border border-gold/45 bg-gold/10 text-sm font-extrabold text-gold"
            onClick={() => {
              setThanksId(null);
              setForm(emptyIdeaForm());
              setEditingId(null);
              textArea.current?.focus();
            }}
          >
            {copy.newIdea}
          </button>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-base font-extrabold text-snow">{copy.wallTitle}</h3>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-3 text-sm leading-relaxed text-snow/75">
            {copy.wallEmpty}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((idea) => (
              <li
                key={idea.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left"
              >
                <p className="text-sm leading-relaxed text-snow">{idea.text}</p>
                <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-gold">
                  {idea.involvement.map((key) => copy[key]).join(" · ")}
                  {idea.hoursPerWeek
                    ? ` · ${interpolate(copy.hoursLine, { hours: idea.hoursPerWeek })}`
                    : ""}
                  {idea.neighborhood ? ` · ${idea.neighborhood}` : ""}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="tap rounded-full border border-white/20 bg-white/5 text-xs font-bold"
                    onClick={() => editIdea(idea)}
                  >
                    {copy.editIdea}
                  </button>
                  <button
                    type="button"
                    className="tap rounded-full border border-gold/45 bg-gold/10 text-xs font-extrabold text-gold"
                    onClick={() => startShare(idea)}
                  >
                    {copy.share}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useModalViewport } from "@/lib/useModalViewport";
import { SignupGate } from "@/components/SignupGate";
import {
  isPlaywrightE2eIdea,
  postIdeaToInbox,
  postRegisterNotice,
  type IdeaInboxPostResult,
} from "@/lib/idea-inbox";
import { postIdeaSaleConfirmation } from "@/lib/idea-sale-confirmation";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";
import { useLocalProfile } from "@/lib/useLocalProfile";
import {
  emptyIdeaSaleForm,
  formatIdeaSalePrice,
  ideaSaleInboxText,
  ideaSaleIssues,
  proposeIdeaSummary,
  IDEA_SALE_CATEGORIES,
  IDEA_SALE_DESCRIPTION_MAX,
  IDEA_SALE_EMAIL_MAX,
  IDEA_SALE_NAME_MAX,
  IDEA_SALE_SUMMARY_MAX,
  IDEA_SALE_TITLE_MAX,
  ideaSaleVideoSrc,
  type IdeaSaleCategory,
  type IdeaSaleForm,
} from "@/lib/idea-sale";
import {
  dictationSupported,
  getSpeechRecognitionCtor,
  transcriptFromEvent,
  type BrowserSpeechRecognition,
} from "@/lib/dictation";
import { dictationLang } from "@/lib/voices";
import {
  postIdeaAttachment,
  prepareIdeaAttachment,
  type PreparedIdeaAttachment,
} from "@/lib/idea-attachment";
import {
  readIdeaSaleSubmissions,
  recordIdeaSaleSubmission,
  submissionFromIdeaSaleForm,
  type IdeaSaleSubmission,
} from "@/lib/idea-sale-list";

const inputClass =
  "min-h-11 w-full rounded-xl border border-white/30 bg-white/90 px-3 text-[15px] text-slate-900";
const buttonClass =
  "tap inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-3.5 text-[15px] font-bold text-slate-900";

export function IdeaSaleDialog({ onClose }: { onClose: () => void }) {
  const { locale, m } = useI18n();
  const g = m.earnNow.ideaSale;
  const videoSrc = ideaSaleVideoSrc(locale);
  const { city, localeHint } = usePlace();
  const [profile] = useLocalProfile();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [form, setForm] = useState<IdeaSaleForm>(() => {
    const base = emptyIdeaSaleForm();
    if (profile) {
      base.name = `${profile.firstName} ${profile.lastName}`.trim();
      base.email = profile.email || "";
    }
    return base;
  });
  const [state, setState] = useState<"idle" | "invalid" | "sending" | IdeaInboxPostResult>("idle");
  const [dictationAvailable] = useState(() => dictationSupported());
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState("");
  const recogRef = useRef<BrowserSpeechRecognition | null>(null);
  const retryLangRef = useRef(false);
  // « Mes idées proposées »: the seller's on-device copy of their confirmed
  // submissions (idea-sale-list.ts), shown when they come back to the section.
  const [submissions, setSubmissions] = useState<IdeaSaleSubmission[]>(() =>
    readIdeaSaleSubmissions(),
  );
  const [attachment, setAttachment] = useState<PreparedIdeaAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<"" | "bad_type" | "too_big" | "unreadable">("");

  const boxRef = useRef<HTMLElement | null>(null);
  const viewport = useModalViewport();

  useEffect(() => {
    // Always reopen on the title + intro (same fix as « Chef de projet », 04/11/2026).
    boxRef.current?.scrollTo({ top: 0 });
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(
    () => () => {
      try {
        recogRef.current?.abort();
      } catch {
        // Already stopped.
      }
      recogRef.current = null;
    },
    [],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (state === "sending") return;
    if (ideaSaleIssues(form).length) {
      setState("invalid");
      return;
    }
    setState("sending");
    const proposalId = `idee-vente-${Date.now().toString(36)}`;
    // Contact first, through the register notice (same channel as a profile
    // save): the seller's name + e-mail reach the team inbox keyed by OPC id,
    // with their consent, so the team can reply about the review and any sale.
    void postRegisterNotice({
      firstName: form.name.trim().split(/\s+/)[0] ?? "",
      opcId: profile?.id || "",
      email: form.email.trim(),
      city: city || "",
    });
    // Optional document/photo next, keyed by the same proposal id, through
    // /idea-attachments (team inbox e-mail with the file attached).
    // Best-effort like the register notice: it never blocks the proposal.
    if (attachment) {
      void postIdeaAttachment({
        id: proposalId,
        title: form.title,
        opcId: profile?.id || "",
        attachment,
      });
    }
    // Proposal next, to the same inbox as Vos idées and « Chef de projet »:
    // tagged text + city + OPC id. No name or e-mail inside — that inbox
    // redacts e-mails by design.
    const inboxText = ideaSaleInboxText(form);
    const result = await postIdeaToInbox({
      id: proposalId,
      text: inboxText,
      city: city || "",
      opcId: profile?.id || "",
    });
    if (result === "sent") {
      // Keep the seller's own copy on this device, so the idea shows up in
      // « Mes idées proposées » when they come back — and right away below.
      const next = recordIdeaSaleSubmission(
        submissionFromIdeaSaleForm(form, proposalId, new Date()),
      );
      setSubmissions(next);
      // Receipt e-mail to the seller (Popol, 07/11/2026), best-effort like
      // every notice here: its failure never affects the submission. The
      // number is the entry's position in « Mes idées proposées » — the
      // same numbering the seller sees in the list. Never for fixtures.
      const number = next.findIndex((item) => item.id === proposalId) + 1;
      if (
        number > 0 &&
        !isPlaywrightE2eIdea({ text: inboxText, opcId: profile?.id || "" })
      ) {
        void postIdeaSaleConfirmation({
          id: proposalId,
          email: form.email,
          title: form.title,
          number,
          lang: locale,
        });
      }
    }
    setState(result);
  }

  function startAnother() {
    const base = emptyIdeaSaleForm();
    // Keep the contact fields: same person, one more idea.
    base.name = form.name;
    base.email = form.email;
    setForm(base);
    setAttachment(null);
    setAttachmentError("");
    setState("idle");
  }

  const patch = (key: keyof IdeaSaleForm, value: string | boolean) =>
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Editing the working text or the summary itself voids the approval:
      // what gets sent must be the summary as approved, word for word.
      if (key === "description" || key === "summary") next.summaryApproved = false;
      return next;
    });

  function appendDictated(text: string) {
    setForm((prev) => {
      const base = prev.description.replace(/\s+$/, "");
      const joined = (base ? `${base} ${text}` : text).slice(0, IDEA_SALE_DESCRIPTION_MAX);
      return { ...prev, description: joined, summaryApproved: false };
    });
  }

  function beginDictation(lang: string) {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setListening(false);
      return;
    }
    const recog = new Ctor();
    recogRef.current = recog;
    recog.lang = lang;
    recog.continuous = true;
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onstart = () => setListening(true);
    recog.onresult = (event) => {
      const { finalText } = transcriptFromEvent(event);
      if (finalText) appendDictated(finalText);
    };
    recog.onerror = (event) => {
      if (event.error === "aborted") return;
      if (event.error === "language-not-supported" && !retryLangRef.current) {
        retryLangRef.current = true;
        return;
      }
      setListening(false);
      setMicError(g.micError);
    };
    recog.onend = () => {
      if (recogRef.current !== recog) return;
      if (retryLangRef.current) {
        retryLangRef.current = false;
        beginDictation(locale === "fr" ? "fr-FR" : locale === "es" ? "es-MX" : "en-GB");
        return;
      }
      recogRef.current = null;
      setListening(false);
    };
    try {
      recog.start();
    } catch {
      setListening(false);
    }
  }

  function toggleDictation() {
    if (listening) {
      try {
        recogRef.current?.stop();
      } catch {
        // onend still runs.
      }
      return;
    }
    setMicError("");
    retryLangRef.current = false;
    beginDictation(dictationLang(locale, localeHint));
  }

  function generateSummary() {
    setForm((prev) => ({
      ...prev,
      summary: proposeIdeaSummary(prev.description),
      summaryApproved: false,
    }));
  }

  async function onAttachmentFile(file: File | null) {
    setAttachmentError("");
    if (!file) {
      setAttachment(null);
      return;
    }
    const prepared = await prepareIdeaAttachment(file);
    if (!prepared.ok) {
      setAttachment(null);
      setAttachmentError(prepared.reason);
      return;
    }
    setAttachment(prepared.value);
  }

  const attachmentErrorText =
    attachmentError === "too_big"
      ? g.attachmentTooBig
      : attachmentError === "bad_type"
        ? g.attachmentBadType
        : attachmentError === "unreadable"
          ? g.attachmentUnreadable
          : "";

  if (typeof document === "undefined") return null;
  // Portal to <body>: inside .app-stage (z-20) the sheet sat under the footer slogan banner.
  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-[90] flex items-end justify-center bg-black/60 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center"
      style={{ top: viewport.top, height: viewport.height }}
      onClick={onClose}
      data-idea-sale-overlay
    >
      <section
        ref={boxRef}
        className="opc-glass-menu max-h-full w-full overscroll-contain max-w-md overflow-y-auto rounded-2xl p-4 text-left text-snow"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-idea-sale-dialog
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-[16px] font-extrabold tracking-wide">{g.title}</h2>
        {videoSrc ? (
          <figure className="mt-3" data-idea-sale-video>
            <video
              className="w-full rounded-xl"
              controls
              preload="metadata"
              src={videoSrc}
              aria-label={g.videoLabel}
            />
            <figcaption className="mt-1 text-[12px] text-snow/80">{g.videoLabel}</figcaption>
          </figure>
        ) : null}
        <p className="mt-2 text-[13px] leading-relaxed text-snow/90">{g.lead}</p>
        <h3 className="mt-3 text-[14px] font-bold">{g.stepsTitle}</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-snow/90">
          {g.stepsList.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="mt-3 text-[13px] font-bold text-snow" data-idea-sale-secret-warning>{g.secretWarning}</p>

        <h3 className="mt-4 text-[14px] font-bold">{g.formTitle}</h3>
        <div className="mt-2">
          <SignupGate>
            {state === "sent" ? (
              <div>
                <p className="text-[13px]" data-idea-sale-sent>{g.sent}</p>
                <button
                  type="button"
                  className={`${buttonClass} mt-2`}
                  onClick={startAnother}
                  data-idea-sale-another
                >
                  {g.submitAnother}
                </button>
              </div>
            ) : (
              <form className="grid gap-2" onSubmit={onSubmit} data-idea-sale-form>
                <label className="grid gap-1 text-[13px]">{g.ideaTitle}
                  <input className={inputClass} value={form.title} maxLength={IDEA_SALE_TITLE_MAX} onChange={(e) => patch("title", e.target.value)} />
                </label>
                <label className="grid gap-1 text-[13px]">{g.category}
                  <select
                    className={inputClass}
                    value={form.category}
                    onChange={(e) => patch("category", e.target.value as IdeaSaleCategory)}
                  >
                    {IDEA_SALE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{g.categories[cat]}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[13px]">{g.description}
                  <textarea className={`${inputClass} min-h-24 py-2`} value={form.description} maxLength={IDEA_SALE_DESCRIPTION_MAX} onChange={(e) => patch("description", e.target.value)} />
                </label>
                {dictationAvailable ? (
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={toggleDictation}
                    aria-pressed={listening}
                    data-idea-sale-dictate
                  >
                    {listening ? g.dictating : g.dictate}
                  </button>
                ) : null}
                {micError ? <p role="alert" className="text-[13px]">{micError}</p> : null}
                <div className="grid gap-1 text-[13px]">
                  <span className="font-bold">{g.summaryTitle}</span>
                  <span className="text-snow/80">{g.summaryHelp}</span>
                  <button type="button" className={buttonClass} onClick={generateSummary} data-idea-sale-summary-generate>
                    {g.summaryGenerate}
                  </button>
                  <textarea
                    className={`${inputClass} min-h-20 py-2`}
                    value={form.summary}
                    maxLength={IDEA_SALE_SUMMARY_MAX}
                    onChange={(e) => patch("summary", e.target.value)}
                    data-idea-sale-summary
                  />
                  <label className="flex items-start gap-2">
                    <input type="checkbox" checked={form.summaryApproved} onChange={(e) => patch("summaryApproved", e.target.checked)} /> {g.summaryApprove}
                  </label>
                </div>
                <label className="grid gap-1 text-[13px]">{g.price}
                  <input className={inputClass} inputMode="decimal" value={form.price} onChange={(e) => patch("price", e.target.value)} />
                  <span className="text-snow/80">{g.priceHelp}</span>
                </label>
                <div className="grid gap-1 text-[13px]">
                  <span className="font-bold">{g.attachment}</span>
                  <span className="text-snow/80">{g.attachmentHelp}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className={inputClass}
                    onChange={(e) => {
                      void onAttachmentFile(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                    data-idea-sale-attachment
                  />
                  {attachment ? (
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate">{attachment.filename}</span>
                      <button
                        type="button"
                        className="underline"
                        onClick={() => setAttachment(null)}
                        data-idea-sale-attachment-remove
                      >
                        {g.attachmentRemove}
                      </button>
                    </span>
                  ) : null}
                  {attachmentErrorText ? <p role="alert" className="text-[13px]">{attachmentErrorText}</p> : null}
                </div>
                <label className="grid gap-1 text-[13px]">{g.name}
                  <input className={inputClass} value={form.name} maxLength={IDEA_SALE_NAME_MAX} autoComplete="name" onChange={(e) => patch("name", e.target.value)} />
                </label>
                <label className="grid gap-1 text-[13px]">{g.email}
                  <input className={inputClass} type="email" inputMode="email" value={form.email} maxLength={IDEA_SALE_EMAIL_MAX} autoComplete="email" onChange={(e) => patch("email", e.target.value)} />
                </label>
                <label className="flex items-start gap-2 text-[13px]">
                  <input type="checkbox" checked={form.consent} onChange={(e) => patch("consent", e.target.checked)} /> {g.consent}
                </label>
                {state === "invalid" ? <p role="alert" className="text-[13px]">{g.invalid}</p> : null}
                {state === "failed" ? <p role="alert" className="text-[13px]">{g.failed}</p> : null}
                <button type="submit" className={buttonClass} disabled={state === "sending"}>
                  {state === "sending" ? g.sending : g.submit}
                </button>
              </form>
            )}
          </SignupGate>
          {submissions.length ? (
            <div className="mt-4" data-idea-sale-my-ideas>
              <h3 className="text-[14px] font-bold">{g.myIdeasTitle}</h3>
              <ul className="mt-2 grid gap-2">
                {submissions.map((entry, index) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-white/20 bg-white/10 p-3"
                    data-idea-sale-my-idea
                  >
                    <p className="text-[13px] font-bold">
                      {g.myIdeaNo} {index + 1} — {entry.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-snow/80">
                      {new Date(entry.submittedAt).toLocaleDateString(
                        locale === "fr" ? "fr-CA" : locale === "es" ? "es-MX" : "en-CA",
                        { year: "numeric", month: "short", day: "numeric" },
                      )}
                      {" · "}
                      {g.categories[entry.category]}
                      {" · "}
                      {g.myIdeaReceived}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-snow/90">{entry.summary}</p>
                    {entry.priceUsd !== null ? (
                      <p className="mt-1 text-[12px] text-snow/80">
                        {g.myIdeaPrice} : {formatIdeaSalePrice(entry.priceUsd)} USD
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <button ref={closeRef} type="button" className={`${buttonClass} mt-3`} onClick={onClose} data-idea-sale-close>
          {g.close}
        </button>
      </section>
    </div>,
    document.body,
  );
}

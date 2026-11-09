"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useModalViewport } from "@/lib/useModalViewport";
import { SignupGate } from "@/components/SignupGate";
import { postIdeaToInbox, postRegisterNotice, type IdeaInboxPostResult } from "@/lib/idea-inbox";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";
import { useLocalProfile } from "@/lib/useLocalProfile";
import {
  appendDictationToDescription,
  clipIdeaSaleSummary,
  emptyIdeaSaleForm,
  ideaSaleInboxText,
  ideaSaleIssues,
  ideaSaleSummarySystemPrompt,
  IDEA_SALE_CATEGORIES,
  IDEA_SALE_DESCRIPTION_MAX,
  IDEA_SALE_DESCRIPTION_MIN,
  IDEA_SALE_EMAIL_MAX,
  IDEA_SALE_NAME_MAX,
  IDEA_SALE_TITLE_MAX,
  type IdeaSaleCategory,
  type IdeaSaleForm,
} from "@/lib/idea-sale";
import {
  pickRecorderMimeType,
  recorderSupported,
  transcribeAudio,
  TranscribeError,
} from "@/lib/transcribe";
import { completeChat } from "@/lib/llm";

const inputClass =
  "min-h-11 w-full rounded-xl border border-white/30 bg-white/90 px-3 text-[15px] text-slate-900";
const buttonClass =
  "tap inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-3.5 text-[15px] font-bold text-slate-900";

export function IdeaSaleDialog({ onClose }: { onClose: () => void }) {
  const { locale, m } = useI18n();
  const g = m.earnNow.ideaSale;
  const { city } = usePlace();
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

  // Dictation (micro) for the description: MediaRecorder + the Worker's
  // /transcribe route (Whisper). Browser speech recognition is missing or
  // failing on iPhone — especially in the installed app — so the recording
  // is transcribed server-side instead (founder's live test, 08/11/2026).
  const [recPhase, setRecPhase] = useState<"idle" | "recording" | "transcribing">("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const [recSupported, setRecSupported] = useState<boolean>(() => recorderSupported());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const aliveRef = useRef(true);
  // « Résumer mon idée » — the AI rewrite is only a proposal until accepted.
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [proposedSummary, setProposedSummary] = useState<string | null>(null);
  const summaryAbortRef = useRef<AbortController | null>(null);

  const boxRef = useRef<HTMLElement | null>(null);
  const viewport = useModalViewport();

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      summaryAbortRef.current?.abort();
      // Closing the dialog mid-recording discards the take and frees the mic.
      discardRef.current = true;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Already stopped.
        }
      }
      const stream = streamRef.current;
      streamRef.current = null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (state === "sending") return;
    if (ideaSaleIssues(form).length) {
      setState("invalid");
      return;
    }
    setState("sending");
    // Contact first, through the register notice (same channel as a profile
    // save): the seller's name + e-mail reach the team inbox keyed by OPC id,
    // with their consent, so the team can reply about the review and any sale.
    void postRegisterNotice({
      firstName: form.name.trim().split(/\s+/)[0] ?? "",
      opcId: profile?.id || "",
      email: form.email.trim(),
      city: city || "",
    });
    // Proposal next, to the same inbox as Vos idées and « Chef de projet »:
    // tagged text + city + OPC id. No name or e-mail inside — that inbox
    // redacts e-mails by design.
    const result = await postIdeaToInbox({
      id: `idee-vente-${Date.now().toString(36)}`,
      text: ideaSaleInboxText(form),
      city: city || "",
      opcId: profile?.id || "",
    });
    setState(result);
  }

  const patch = (key: keyof IdeaSaleForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function micErrorCopy(error: unknown) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") return g.micPermission;
    if (name === "NotFoundError" || name === "OverconstrainedError") return g.micNoDevice;
    return g.micError;
  }

  /** Stop any live recording without transcribing it (close, summarize…). */
  function discardRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    discardRef.current = true;
    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Already stopped; onstop may not fire, so reset the phase here.
        setRecPhase("idle");
      }
    }
  }

  async function transcribeRecording(blob: Blob) {
    setRecPhase("transcribing");
    try {
      const text = await transcribeAudio(blob, locale);
      if (!aliveRef.current) return;
      setForm((prev) => ({
        ...prev,
        description: appendDictationToDescription(prev.description, text),
      }));
      // The text changed: any summary proposed for the old text is stale.
      setProposedSummary(null);
      setMicError(null);
    } catch (error) {
      if (!aliveRef.current) return;
      setMicError(error instanceof TranscribeError ? g.micTranscribeFailed : g.micError);
    } finally {
      if (aliveRef.current) setRecPhase("idle");
    }
  }

  async function startRecording() {
    if (recPhase !== "idle") return;
    setMicError(null);
    if (!recorderSupported()) {
      setRecSupported(false);
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      setMicError(micErrorCopy(error));
      return;
    }
    if (!aliveRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    try {
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      discardRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        discardRef.current = true;
        if (aliveRef.current) setMicError(g.micError);
      };
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (recorderRef.current === recorder) recorderRef.current = null;
        const chunks = chunksRef.current;
        chunksRef.current = [];
        const discard = discardRef.current;
        discardRef.current = false;
        if (!aliveRef.current) return;
        if (discard) {
          setRecPhase("idle");
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/mp4" });
        if (blob.size === 0) {
          setRecPhase("idle");
          setMicError(g.micTranscribeFailed);
          return;
        }
        void transcribeRecording(blob);
      };
      recorderRef.current = recorder;
      streamRef.current = stream;
      recorder.start();
      setRecPhase("recording");
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setMicError(g.micError);
    }
  }

  function toggleDictation() {
    if (recPhase === "recording") {
      // The recorder's onstop assembles the take and transcribes it.
      try {
        recorderRef.current?.stop();
      } catch {
        setRecPhase("idle");
      }
      return;
    }
    void startRecording();
  }

  const descriptionReady = form.description.trim().length >= IDEA_SALE_DESCRIPTION_MIN;

  async function onSummarize() {
    if (summaryBusy || !descriptionReady) return;
    discardRecording();
    setSummaryFailed(false);
    setProposedSummary(null);
    setSummaryBusy(true);
    summaryAbortRef.current?.abort();
    const controller = new AbortController();
    summaryAbortRef.current = controller;
    try {
      const reply = await completeChat({
        system: ideaSaleSummarySystemPrompt(locale),
        messages: [{ role: "user", content: form.description }],
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setProposedSummary(clipIdeaSaleSummary(reply));
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      // The original text is never touched on failure.
      setSummaryFailed(true);
    } finally {
      if (summaryAbortRef.current === controller) setSummaryBusy(false);
    }
  }

  function useProposedSummary() {
    if (proposedSummary) patch("description", proposedSummary);
    setProposedSummary(null);
  }

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
              <p className="text-[13px]" data-idea-sale-sent>{g.sent}</p>
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
                  <textarea className={`${inputClass} min-h-24 py-2`} value={form.description} maxLength={IDEA_SALE_DESCRIPTION_MAX} onChange={(e) => { patch("description", e.target.value); setProposedSummary(null); }} />
                </label>
                <div className="grid gap-2" data-idea-sale-desc-tools>
                  {recSupported === false ? (
                    <p className="text-[13px] text-snow/90">{g.micUnsupported}</p>
                  ) : (
                    <button
                      type="button"
                      className={`${buttonClass} disabled:opacity-50`}
                      aria-pressed={recPhase === "recording"}
                      disabled={recPhase === "transcribing"}
                      onClick={toggleDictation}
                      data-idea-sale-mic
                    >
                      {recPhase === "recording"
                        ? g.micStop
                        : recPhase === "transcribing"
                          ? g.micTranscribing
                          : g.micStart}
                    </button>
                  )}
                  {recPhase === "recording" ? (
                    <p role="status" className="text-[13px]">{g.micRecording}</p>
                  ) : null}
                  {micError ? <p role="status" className="text-[13px]">{micError}</p> : null}
                  <button
                    type="button"
                    className={`${buttonClass} disabled:opacity-50`}
                    disabled={!descriptionReady || summaryBusy}
                    onClick={() => void onSummarize()}
                    data-idea-sale-summarize
                  >
                    {summaryBusy ? g.summarizing : g.summarize}
                  </button>
                  {summaryFailed ? <p role="alert" className="text-[13px]">{g.summaryFailed}</p> : null}
                  {proposedSummary ? (
                    <div className="grid gap-2 rounded-xl border border-white/30 bg-white/10 p-3" data-idea-sale-summary>
                      <p className="text-[13px] font-bold">{g.summaryTitle}</p>
                      <p className="text-[13px] leading-relaxed">{proposedSummary}</p>
                      <button type="button" className={buttonClass} onClick={useProposedSummary}>
                        {g.summaryUse}
                      </button>
                      <button type="button" className={buttonClass} onClick={() => setProposedSummary(null)}>
                        {g.summaryKeep}
                      </button>
                    </div>
                  ) : null}
                </div>
                <label className="grid gap-1 text-[13px]">{g.price}
                  <input className={inputClass} value={form.price} inputMode="decimal" autoComplete="off" onChange={(e) => patch("price", e.target.value)} data-idea-sale-price />
                </label>
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
        </div>
        <button ref={closeRef} type="button" className={`${buttonClass} mt-3`} onClick={onClose} data-idea-sale-close>
          {g.close}
        </button>
      </section>
    </div>,
    document.body,
  );
}

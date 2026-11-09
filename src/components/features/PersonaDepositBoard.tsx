"use client";

/**
 * « Monétise-toi : image et voix » — the persona deposit journey
 * (decision by Popol, 07/11/2026). Five steps behind one gate:
 * consent → voice → image + video → biometric selfie → deposit recap.
 *
 * COLLECTION IS OFF by default (PERSONA_COLLECTION_ENABLED = false):
 * Indiana Lane (IA) ruled that nothing may be collected until her consent
 * text is validated — in that state this board renders only a sober
 * « En préparation » panel and the Earn Now entry is not a link.
 *
 * Honesty rules baked in:
 * - nothing opens before the consent is accepted AND recorded locally
 *   (timestamp + version of the text shown — provisional text until
 *   Indiana Lane (IA) delivers the definitive legal form, see
 *   persona-deposit.ts);
 * - the biometric step NEVER shows a fabricated « identity verified »
 *   verdict: a finished deposit is « en vérification » by the team;
 * - no compensation amount anywhere: the amount is not set yet.
 *
 * Media blobs are stored on-device (IndexedDB, persona-media.ts) as soon
 * as they are captured; a file is shown as « consigné » ONLY after the
 * vault write is confirmed — while it is in flight the UI says
 * « Enregistrement… », and a failed write is shown as a failure, never as
 * recorded (the metadata that unlocks steps is persisted only after a
 * confirmed write). Microphone/camera streams are fully stopped after
 * every capture and every failure, and preview object URLs are revoked
 * when replaced, on a new deposit and on unmount. Only a metadata notice
 * is POSTed, best-effort, to the proposed /persona-deposits Worker route
 * (inactive until Indiana activates it — the dossier then simply stays
 * complete on the device).
 */

import { useEffect, useRef, useState } from "react";
import { interpolate } from "@/lib/i18n/locales";
import { cleanCountry, cleanPseudonym } from "@/lib/twin-bank";
import { useI18n } from "@/lib/i18n/locale";
import {
  canOpenPersonaStep,
  clearPersonaDeposit,
  emptyPersonaConsentChecks,
  emptyPersonaDeposit,
  loadPersonaDeposit,
  newPersonaDepositId,
  personaConsentComplete,
  personaFileIssue,
  personaFurthestStep,
  personaStepSatisfied,
  personaVisibleSteps,
  nextPersonaStep,
  prevPersonaStep,
  PERSONA_AUDIO_MIME_CANDIDATES,
  PERSONA_COLLECTION_ENABLED,
  PERSONA_VIDEO_MIME_CANDIDATES,
  pickRecorderMimeType,
  recordPersonaChoice,
  uploadPersonaDeposit,
  withdrawPersonaDeposit,
  recordPersonaConsent,
  recordPersonaMedia,
  savePersonaDeposit,
  type PersonaConsentChecks,
  type PersonaDeposit,
  type PersonaMediaKind,
  type PersonaStep,
} from "@/lib/persona-deposit";
import {
  deletePersonaMedia,
  loadPersonaMedia,
  revokePreviewUrls,
  savePersonaMedia,
  stopMediaStream,
} from "@/lib/persona-media";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-[0_8px_20px_rgba(15,23,42,0.05)]";
const buttonClass =
  "tap inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-3.5 text-[15px] font-bold text-slate-900 disabled:opacity-40";
const primaryClass =
  "tap inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-3.5 text-[15px] font-bold text-white disabled:opacity-40";
const checkRowClass = "flex items-start gap-2 text-[13px] leading-snug text-slate-800";
const alertClass = "rounded-xl bg-amber-50 p-2 text-[13px] font-bold text-amber-900";

type MediaUrls = Partial<Record<PersonaMediaKind, string>>;

/** Per-file write state: a file is « consigné » only in the "saved" state. */
type MediaSaveState = "saving" | "saved" | "failed";

function mediaSupported(kind: "audio" | "video"): boolean {
  if (typeof window === "undefined") return false;
  if (typeof MediaRecorder === "undefined") return false;
  const md = navigator.mediaDevices;
  if (!md || typeof md.getUserMedia !== "function") return false;
  void kind;
  return true;
}

export function PersonaDepositBoard() {
  const { m, locale } = useI18n();
  const g = m.earnNow.personaMonetise;

  const [deposit, setDeposit] = useState<PersonaDeposit | null>(null);
  const [step, setStep] = useState<PersonaStep>("choice");
  const [choice, setChoice] = useState({ voice: false, image: false, pseudonym: "", country: "" });
  const [withdrawAsk, setWithdrawAsk] = useState(false);
  const [withdrawNote, setWithdrawNote] = useState("");
  const [checks, setChecks] = useState<PersonaConsentChecks>(emptyPersonaConsentChecks());
  const [resumed, setResumed] = useState(false);
  const [urls, setUrls] = useState<MediaUrls>({});
  const urlsRef = useRef<MediaUrls>({});
  const [fileNotes, setFileNotes] = useState<Partial<Record<PersonaMediaKind, string>>>({});
  const [saveStates, setSaveStates] = useState<Partial<Record<PersonaMediaKind, MediaSaveState>>>({});

  // Voice recording state.
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState("");
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Biometric live-capture state.
  const [cameraOn, setCameraOn] = useState(false);
  const [selfieRecording, setSelfieRecording] = useState(false);
  const [selfieSeconds, setSelfieSeconds] = useState(0);
  const [cameraError, setCameraError] = useState("");
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const selfieRecorderRef = useRef<MediaRecorder | null>(null);
  const selfieStreamRef = useRef<MediaStream | null>(null);
  const selfieChunksRef = useRef<Blob[]>([]);
  const selfieTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [finalizing, setFinalizing] = useState(false);

  /* ------------------------------------------------------------ */
  /* Boot: resume the on-device deposit, or start a fresh one.     */
  /* ------------------------------------------------------------ */
  useEffect(() => {
    // Collection is OFF until Indiana Lane (IA) validates the consent text:
    // no resume, no finalize, nothing read for collection purposes.
    if (!PERSONA_COLLECTION_ENABLED) return;
    const stored = loadPersonaDeposit();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- boot sync from on-device durable storage (house pattern, cf. IdeasBoard)
      setDeposit(stored);
      setStep(personaFurthestStep(stored));
      if (stored.consent || Object.keys(stored.media).length > 0) setResumed(true);
      if (stored.consent) {
        setChecks({ terms: true, adult: true, compensation: true, selfOnly: true });
      }
      setChoice({ ...stored.offer, pseudonym: stored.pseudonym, country: stored.country });
      // A complete-but-unfinalized dossier (app closed on the last step)
      // is deposited now: status « en vérification » + best-effort notice.
      if (personaFurthestStep(stored) === "done" && stored.status === "en-cours") {
        void (async () => {
          const finished: PersonaDeposit = {
            ...stored,
            status: "en-verification",
            updatedAt: Date.now(),
          };
          const up = await uploadPersonaDeposit(finished, (kind) => loadPersonaMedia(finished.id, kind));
          const withUpload: PersonaDeposit = {
            ...finished,
            upload: up.result,
            withdrawToken: up.result === "sent" ? up.withdrawToken : "",
          };
          savePersonaDeposit(withUpload);
          setDeposit(withUpload);
        })();
      }
    } else {
      setDeposit(emptyPersonaDeposit(newPersonaDepositId(Date.now(), Math.random()), Date.now()));
    }
  }, []);

  /* Load previews for media already in the vault whenever the deposit changes. */
  useEffect(() => {
    if (!deposit) return;
    let cancelled = false;
    const kinds = Object.keys(deposit.media) as PersonaMediaKind[];
    void (async () => {
      const next: MediaUrls = {};
      for (const kind of kinds) {
        const blob = await loadPersonaMedia(deposit.id, kind);
        if (blob) next[kind] = URL.createObjectURL(blob);
      }
      if (cancelled) {
        revokePreviewUrls(Object.values(next));
        return;
      }
      // Replaced previews are released so their blobs can be collected.
      revokePreviewUrls(Object.values(urlsRef.current));
      urlsRef.current = next;
      setUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [deposit]);

  /* Revoke all preview URLs on unmount (via the ref — state would be stale). */
  useEffect(() => {
    const current = urlsRef;
    return () => {
      revokePreviewUrls(Object.values(current.current));
      current.current = {};
    };
  }, []);

  /* Never sit on a step the deposit has not unlocked. */
  useEffect(() => {
    if (deposit && !canOpenPersonaStep(deposit, step)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp to the furthest unlocked step
      setStep(personaFurthestStep(deposit));
    }
  }, [deposit, step]);

  /* Stop streams/timers on unmount — mic and camera must never stay live. */
  useEffect(() => {
    const voiceStream = voiceStreamRef;
    const selfieStream = selfieStreamRef;
    const voiceTimer = voiceTimerRef;
    const selfieTimer = selfieTimerRef;
    return () => {
      stopMediaStream(voiceStream.current);
      stopMediaStream(selfieStream.current);
      if (voiceTimer.current) clearInterval(voiceTimer.current);
      if (selfieTimer.current) clearInterval(selfieTimer.current);
    };
  }, []);

  if (!PERSONA_COLLECTION_ENABLED) {
    // Sober « En préparation » state (Indiana Lane (IA), 07/11/2026): the
    // journey opens only once her consent text is validated. No capture,
    // no upload, no deposit is possible in this state.
    return (
      <div className="grid gap-3" data-persona-board data-persona-disabled>
        <section className={cardClass}>
          <h3 className="text-[15px] font-extrabold text-slate-900">{g.title}</h3>
          <p className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-wide text-amber-900">
            {g.preparingTitle}
          </p>
          <p className="mt-2 text-[13px] leading-snug text-slate-700">{g.preparingLead}</p>
        </section>
      </div>
    );
  }

  if (!deposit) return null;

  const visibleSteps = personaVisibleSteps(deposit);
  const stepIndex = Math.max(0, visibleSteps.indexOf(step));
  const furthest = personaFurthestStep(deposit);

  function persist(next: PersonaDeposit) {
    savePersonaDeposit(next);
    setDeposit(next);
  }

  /**
   * Persist one captured file. Returns true only once the vault write is
   * CONFIRMED: the metadata record (which unlocks steps and fills the
   * recap) is written only after savePersonaMedia resolves true, so
   * nothing is ever displayed as « consigné » before it truly is.
   */
  async function storeMedia(kind: PersonaMediaKind, blob: Blob): Promise<boolean> {
    if (!deposit) return false;
    setSaveStates((prev) => ({ ...prev, [kind]: "saving" }));
    const saved = await savePersonaMedia(deposit.id, kind, blob);
    if (!saved) {
      setSaveStates((prev) => ({ ...prev, [kind]: "failed" }));
      return false;
    }
    persist(
      recordPersonaMedia(deposit, kind, { type: blob.type || "application/octet-stream", size: blob.size }, Date.now()),
    );
    setSaveStates((prev) => ({ ...prev, [kind]: "saved" }));
    return true;
  }

  /* ------------------------------------------------------------ */
  /* Consent gate                                                  */
  /* ------------------------------------------------------------ */
  function acceptConsent() {
    if (!deposit || !personaConsentComplete(checks)) return;
    const next = recordPersonaConsent(deposit, Date.now());
    persist(next);
    setStep(nextPersonaStep(next, "consent"));
  }

  const choicePseudonym = cleanPseudonym(choice.pseudonym);
  const choiceCountry = cleanCountry(choice.country);
  const choiceReady = (choice.voice || choice.image) && Boolean(choicePseudonym) && Boolean(choiceCountry);

  function acceptChoice() {
    if (!deposit || !choiceReady) return;
    const next = recordPersonaChoice(
      deposit,
      { offer: { voice: choice.voice, image: choice.image }, pseudonym: choicePseudonym, country: choiceCountry },
      Date.now(),
    );
    persist(next);
    setStep(nextPersonaStep(next, "choice"));
  }

  /* ------------------------------------------------------------ */
  /* Voice recording                                               */
  /* ------------------------------------------------------------ */
  async function startVoiceRecording() {
    setVoiceError("");
    if (!mediaSupported("audio")) {
      setVoiceError(g.micUnsupported);
      return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const mime = pickRecorderMimeType(PERSONA_AUDIO_MIME_CANDIDATES, (t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      voiceChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(voiceChunksRef.current, {
          type: recorder.mimeType || mime || "audio/webm",
        });
        void storeMedia("voice", blob);
        // Capture over: cut the microphone completely.
        stopMediaStream(voiceStreamRef.current);
        voiceStreamRef.current = null;
      };
      recorder.onerror = () => {
        if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
        setVoiceRecording(false);
        // Capture failed: cut the microphone completely.
        stopMediaStream(voiceStreamRef.current);
        voiceStreamRef.current = null;
        setVoiceError(g.captureError);
      };
      voiceRecorderRef.current = recorder;
      recorder.start();
      setVoiceSeconds(0);
      setVoiceRecording(true);
      voiceTimerRef.current = setInterval(() => setVoiceSeconds((s) => s + 1), 1000);
    } catch {
      // Refusal or recorder failure: never leave a stream running.
      stopMediaStream(stream);
      if (voiceStreamRef.current === stream) voiceStreamRef.current = null;
      setVoiceError(g.micDenied);
    }
  }

  function stopVoiceRecording() {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setVoiceRecording(false);
    voiceRecorderRef.current?.stop();
  }

  /* ------------------------------------------------------------ */
  /* File uploads (image, video, selfie-by-upload)                 */
  /* ------------------------------------------------------------ */
  async function onFile(kind: Exclude<PersonaMediaKind, "voice">, file: File | null) {
    if (!file) return;
    const issue = personaFileIssue(kind, file);
    if (issue) {
      setFileNotes((prev) => ({
        ...prev,
        [kind]: issue === "empty" ? g.fileEmpty : issue === "type" ? g.fileWrongType : g.fileTooBig,
      }));
      return;
    }
    // Honest transient state first: « consigné » appears only after the
    // vault write is confirmed; a failed write is reported as a failure.
    setFileNotes((prev) => ({ ...prev, [kind]: g.fileSaving }));
    const saved = await storeMedia(kind, file);
    setFileNotes((prev) => ({ ...prev, [kind]: saved ? g.fileSaved : g.fileSaveFailed }));
  }

  /* ------------------------------------------------------------ */
  /* Biometric live capture                                        */
  /* ------------------------------------------------------------ */
  async function startCamera() {
    setCameraError("");
    if (!mediaSupported("video")) {
      setCameraError(g.cameraUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        // The code is said aloud: the verification video carries the voice too.
        audio: true,
      });
      selfieStreamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          void cameraVideoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(g.cameraDenied);
    }
  }

  function stopCamera() {
    if (selfieTimerRef.current) clearInterval(selfieTimerRef.current);
    setSelfieRecording(false);
    selfieRecorderRef.current?.stop();
    // Cut the camera completely and detach it from the preview element.
    stopMediaStream(selfieStreamRef.current);
    selfieStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setCameraOn(false);
  }

  function startSelfieRecording() {
    const stream = selfieStreamRef.current;
    if (!stream) return;
    try {
      const mime = pickRecorderMimeType(PERSONA_VIDEO_MIME_CANDIDATES, (t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      selfieChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) selfieChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(selfieChunksRef.current, {
          type: recorder.mimeType || mime || "video/webm",
        });
        void storeMedia("selfie", blob);
        // Capture over: cut the camera completely.
        stopMediaStream(selfieStreamRef.current);
        selfieStreamRef.current = null;
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
        setCameraOn(false);
      };
      recorder.onerror = () => {
        if (selfieTimerRef.current) clearInterval(selfieTimerRef.current);
        setSelfieRecording(false);
        // Capture failed: cut the camera completely.
        stopMediaStream(selfieStreamRef.current);
        selfieStreamRef.current = null;
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
        setCameraOn(false);
        setCameraError(g.captureError);
      };
      selfieRecorderRef.current = recorder;
      recorder.start();
      setSelfieSeconds(0);
      setSelfieRecording(true);
      selfieTimerRef.current = setInterval(() => setSelfieSeconds((s) => s + 1), 1000);
    } catch {
      // Recorder failure: never leave the camera running.
      stopMediaStream(selfieStreamRef.current);
      selfieStreamRef.current = null;
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
      setCameraOn(false);
      setCameraError(g.captureError);
    }
  }

  function stopSelfieRecording() {
    if (selfieTimerRef.current) clearInterval(selfieTimerRef.current);
    setSelfieRecording(false);
    selfieRecorderRef.current?.stop();
  }

  /* ------------------------------------------------------------ */
  /* Final deposit                                                 */
  /* ------------------------------------------------------------ */
  async function finalize() {
    if (!deposit || furthest !== "done" || finalizing) return;
    setFinalizing(true);
    const finished: PersonaDeposit = { ...deposit, status: "en-verification", updatedAt: Date.now() };
    persist(finished);
    setStep("done");
    // Upload consent + media to the private twin bank (R2 behind the Worker).
    const up = await uploadPersonaDeposit(finished, (kind) => loadPersonaMedia(finished.id, kind));
    persist({ ...finished, upload: up.result, withdrawToken: up.result === "sent" ? up.withdrawToken : "" });
    setFinalizing(false);
  }

  async function retryUpload() {
    if (!deposit || finalizing || deposit.status !== "en-verification") return;
    setFinalizing(true);
    const up = await uploadPersonaDeposit(deposit, (kind) => loadPersonaMedia(deposit.id, kind));
    persist({ ...deposit, upload: up.result, withdrawToken: up.result === "sent" ? up.withdrawToken : "" });
    setFinalizing(false);
  }

  /** Withdraw: server deletion first (when the dossier reached the bank), then the device copy. */
  async function withdraw() {
    if (!deposit) return;
    setWithdrawNote("");
    if (deposit.upload === "sent") {
      const result = await withdrawPersonaDeposit(deposit);
      if (result !== "withdrawn") {
        setWithdrawNote(g.withdrawFailed);
        return;
      }
    }
    for (const kind of Object.keys(deposit.media) as PersonaMediaKind[]) {
      await deletePersonaMedia(deposit.id, kind);
    }
    revokePreviewUrls(Object.values(urlsRef.current));
    urlsRef.current = {};
    setUrls({});
    persist({ ...deposit, media: {}, status: "retire", withdrawToken: "", updatedAt: Date.now() });
    setWithdrawAsk(false);
    setWithdrawNote(g.withdrawDone);
  }

  async function startNewDeposit() {
    if (!deposit) return;
    for (const kind of Object.keys(deposit.media) as PersonaMediaKind[]) {
      await deletePersonaMedia(deposit.id, kind);
    }
    clearPersonaDeposit();
    // Release every preview of the closed dossier.
    revokePreviewUrls(Object.values(urlsRef.current));
    urlsRef.current = {};
    setUrls({});
    setSaveStates({});
    setChecks(emptyPersonaConsentChecks());
    setFileNotes({});
    setResumed(false);
    setWithdrawAsk(false);
    setWithdrawNote("");
    setChoice({ voice: false, image: false, pseudonym: "", country: "" });
    const fresh = emptyPersonaDeposit(newPersonaDepositId(Date.now(), Math.random()), Date.now());
    setDeposit(fresh);
    setStep("choice");
  }

  const consentDate = deposit.consent
    ? new Date(deposit.consent.acceptedAt).toLocaleDateString(
        locale === "en" ? "en-CA" : locale === "es" ? "es" : "fr-CA",
      )
    : "";

  const recapRows: Array<{ label: string; kind: PersonaMediaKind | "consent" }> = [
    { label: g.recapConsent, kind: "consent" },
    ...(deposit.offer.voice ? [{ label: g.recapVoice, kind: "voice" as const }] : []),
    ...(deposit.offer.image
      ? [
          { label: g.recapImage, kind: "image" as const },
          { label: g.recapVideo, kind: "video" as const },
        ]
      : []),
    { label: g.recapSelfie, kind: "selfie" as const },
  ];
  const uploadNote =
    deposit.upload === "sent"
      ? g.uploadSent
      : deposit.upload === "not-configured"
        ? g.uploadNotConfigured
        : deposit.upload === "failed"
          ? g.uploadFailed
          : finalizing
            ? g.uploading
            : g.uploadPending;

  return (
    <div className="grid gap-3" data-persona-board>
      <p className="text-left text-sm leading-snug text-slate-600">{g.lead}</p>
      <p className="text-left text-[13px] font-bold text-slate-800" data-persona-adult-note>{g.adultNote}</p>

      <section className={cardClass} aria-label={g.stepsTitle}>
        <h3 className="text-[15px] font-extrabold text-slate-900">{g.stepsTitle}</h3>
        <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[13px] leading-snug text-slate-700">
          {g.stepsList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="mt-2 text-[13px] leading-snug text-slate-600">{g.deviceNote}</p>
        {resumed && deposit.status !== "en-verification" ? (
          <p className="mt-2 text-[13px] font-bold text-slate-800" data-persona-resumed>
            {g.resumeNote}
          </p>
        ) : null}
      </section>

      <p className="text-left text-[13px] font-bold text-slate-700" data-persona-progress>
        {interpolate(g.progress, {
          step: String(stepIndex + 1),
          total: String(visibleSteps.length),
          name: g.stepNames[step],
        })}
      </p>

      {step === "choice" ? (
        <section className={cardClass} data-persona-step="choice">
          <h3 className="text-[15px] font-extrabold text-slate-900">{g.choiceTitle}</h3>
          <p className="mt-1 text-[13px] leading-snug text-slate-700">{g.choiceLead}</p>
          <div className="mt-3 grid gap-2">
            <label className={checkRowClass}>
              <input
                type="checkbox"
                checked={choice.voice}
                onChange={(e) => setChoice((c) => ({ ...c, voice: e.target.checked }))}
                data-persona-offer="voice"
              />
              {g.offerVoice}
            </label>
            <label className={checkRowClass}>
              <input
                type="checkbox"
                checked={choice.image}
                onChange={(e) => setChoice((c) => ({ ...c, image: e.target.checked }))}
                data-persona-offer="image"
              />
              {g.offerImage}
            </label>
            <label className="grid gap-1 text-[13px] font-bold text-slate-800">
              {g.pseudonymLabel}
              <input
                type="text"
                maxLength={40}
                value={choice.pseudonym}
                onChange={(e) => setChoice((c) => ({ ...c, pseudonym: e.target.value }))}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-[15px] font-normal text-slate-900"
                style={{ WebkitTextFillColor: "#0f172a" }}
                data-persona-pseudonym
              />
              <span className="text-[12px] font-normal text-slate-600">{g.pseudonymHint}</span>
            </label>
            <label className="grid gap-1 text-[13px] font-bold text-slate-800">
              {g.countryLabel}
              <input
                type="text"
                maxLength={40}
                value={choice.country}
                onChange={(e) => setChoice((c) => ({ ...c, country: e.target.value }))}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-[15px] font-normal text-slate-900"
                style={{ WebkitTextFillColor: "#0f172a" }}
                data-persona-country
              />
            </label>
          </div>
          <button
            type="button"
            className={`${primaryClass} mt-3`}
            disabled={!choiceReady}
            onClick={acceptChoice}
            data-persona-next
          >
            {g.next}
          </button>
        </section>
      ) : null}

      {step === "consent" ? (
        <section className={cardClass} data-persona-step="consent">
          <h3 className="text-[15px] font-extrabold text-slate-900">{g.consentTitle}</h3>
          <p className="mt-1 text-[13px] leading-snug text-slate-700">{g.consentIntro}</p>
          {/* Texte de consentement d’Indiana, v1 (TWIN_BANK_CONSENT_VERSION). */}
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-snug text-slate-700">
            {g.consentItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2">
            <label className={checkRowClass}>
              <input
                type="checkbox"
                checked={checks.terms}
                onChange={(e) => setChecks((c) => ({ ...c, terms: e.target.checked }))}
                data-persona-consent-check="terms"
              />
              {g.consentTerms}
            </label>
            <label className={checkRowClass}>
              <input
                type="checkbox"
                checked={checks.adult}
                onChange={(e) => setChecks((c) => ({ ...c, adult: e.target.checked }))}
                data-persona-consent-check="adult"
              />
              {g.consentAdult}
            </label>
            <label className={checkRowClass}>
              <input
                type="checkbox"
                checked={checks.compensation}
                onChange={(e) => setChecks((c) => ({ ...c, compensation: e.target.checked }))}
                data-persona-consent-check="compensation"
              />
              {g.consentCompensation}
            </label>
            <label className={checkRowClass}>
              <input
                type="checkbox"
                checked={checks.selfOnly}
                onChange={(e) => setChecks((c) => ({ ...c, selfOnly: e.target.checked }))}
                data-persona-consent-check="selfOnly"
              />
              {g.consentSelfOnly}
            </label>
          </div>
          {deposit.consent ? (
            <p className="mt-2 text-[13px] font-bold text-emerald-800" data-persona-consent-recorded>
              {interpolate(g.consentRecorded, { date: consentDate })}
            </p>
          ) : null}
          <button
            type="button"
            className={`${primaryClass} mt-3`}
            disabled={!personaConsentComplete(checks)}
            onClick={acceptConsent}
            data-persona-next
          >
            {g.next}
          </button>
        </section>
      ) : null}

      {step === "voice" ? (
        <section className={cardClass} data-persona-step="voice">
          <h3 className="text-[15px] font-extrabold text-slate-900">{g.voiceTitle}</h3>
          <p className="mt-1 text-[13px] leading-snug text-slate-700">{g.voiceLead}</p>
          <p className="mt-2 text-[13px] font-bold text-slate-800">{g.voiceScriptLabel}</p>
          <blockquote className="mt-1 rounded-xl bg-slate-50 p-3 text-[14px] leading-relaxed text-slate-900">
            {g.voiceScript}
          </blockquote>
          {voiceError ? (
            <p role="alert" className={`${alertClass} mt-2`} data-persona-voice-error>
              {voiceError}
            </p>
          ) : null}
          {voiceRecording ? (
            <p className="mt-2 text-[13px] font-bold text-red-700" data-persona-voice-recording>
              {interpolate(g.voiceRecording, { seconds: String(voiceSeconds) })}
            </p>
          ) : null}
          {saveStates.voice === "saving" ? (
            <p className="mt-2 text-[13px] font-bold text-slate-800" data-persona-voice-saving>
              {g.fileSaving}
            </p>
          ) : null}
          {saveStates.voice === "failed" ? (
            <p role="alert" className={`${alertClass} mt-2`} data-persona-voice-save-error>
              {g.fileSaveFailed}
            </p>
          ) : null}
          <div className="mt-3 grid gap-2">
            {voiceRecording ? (
              <button type="button" className={primaryClass} onClick={stopVoiceRecording} data-persona-voice-stop>
                {g.voiceStop}
              </button>
            ) : (
              <button type="button" className={primaryClass} onClick={startVoiceRecording} data-persona-voice-record>
                {urls.voice ? g.voiceRerecord : g.voiceRecord}
              </button>
            )}
            {urls.voice ? (
              <>
                <p className="text-[13px] font-bold text-slate-800">{g.voiceListen}</p>
                
                <audio controls src={urls.voice} className="w-full" data-persona-voice-preview />
                <p className="text-[13px] text-slate-700">{g.voiceSaved}</p>
              </>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className={buttonClass} onClick={() => setStep(prevPersonaStep(deposit, "voice"))} data-persona-back>
              {g.back}
            </button>
            <button
              type="button"
              className={primaryClass}
              disabled={!personaStepSatisfied(deposit, "voice") || voiceRecording}
              onClick={() => setStep(nextPersonaStep(deposit, "voice"))}
              data-persona-next
            >
              {g.next}
            </button>
          </div>
        </section>
      ) : null}

      {step === "media" ? (
        <section className={cardClass} data-persona-step="media">
          <h3 className="text-[15px] font-extrabold text-slate-900">{g.mediaTitle}</h3>
          <p className="mt-1 text-[13px] leading-snug text-slate-700">{g.mediaLead}</p>
          <div className="mt-3 grid gap-3">
            <div>
              <label className="grid gap-1 text-[13px] font-bold text-slate-800">
                {g.imageLabel}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => void onFile("image", e.target.files?.[0] ?? null)}
                  data-persona-file="image"
                />
              </label>
              {fileNotes.image ? (
                <p className="mt-1 text-[13px] text-slate-700" data-persona-file-note="image">
                  {fileNotes.image}
                </p>
              ) : null}
              {urls.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls.image} alt="" className="mt-2 max-h-56 w-full rounded-xl object-cover" data-persona-image-preview />
              ) : null}
            </div>
            <div>
              <label className="grid gap-1 text-[13px] font-bold text-slate-800">
                {g.videoLabel}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => void onFile("video", e.target.files?.[0] ?? null)}
                  data-persona-file="video"
                />
              </label>
              {fileNotes.video ? (
                <p className="mt-1 text-[13px] text-slate-700" data-persona-file-note="video">
                  {fileNotes.video}
                </p>
              ) : null}
              {urls.video ? (
                <video controls src={urls.video} className="mt-2 max-h-56 w-full rounded-xl" data-persona-video-preview />
              ) : null}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className={buttonClass} onClick={() => setStep(prevPersonaStep(deposit, "media"))} data-persona-back>
              {g.back}
            </button>
            <button
              type="button"
              className={primaryClass}
              disabled={!personaStepSatisfied(deposit, "media")}
              onClick={() => setStep(nextPersonaStep(deposit, "media"))}
              data-persona-next
            >
              {g.next}
            </button>
          </div>
        </section>
      ) : null}

      {step === "biometry" ? (
        <section className={cardClass} data-persona-step="biometry">
          <h3 className="text-[15px] font-extrabold text-slate-900">{g.biometryTitle}</h3>
          <p className="mt-1 text-[13px] leading-snug text-slate-700">{g.biometryLead}</p>
          <p className="mt-2 text-[13px] font-bold text-slate-800">{g.biometryPhraseLabel}</p>
          <blockquote className="mt-1 rounded-xl bg-slate-50 p-3 text-[15px] font-bold leading-relaxed text-slate-900" data-persona-liveness-phrase>
            {interpolate(g.biometryPhrase, { name: deposit.pseudonym, code: deposit.livenessCode })}
          </blockquote>
          <p className="mt-2 rounded-xl bg-sky-50 p-2 text-[13px] leading-snug text-slate-700">
            {g.biometryHonest}
          </p>
          <p className="mt-3 text-[13px] font-bold text-slate-800">{g.selfieLiveLabel}</p>
          {cameraError ? (
            <p role="alert" className={`${alertClass} mt-2`} data-persona-camera-error>
              {cameraError}
            </p>
          ) : null}
          {cameraOn ? (
            <>
              
              <video
                ref={cameraVideoRef}
                muted
                playsInline
                className="mt-2 max-h-64 w-full rounded-xl bg-black object-cover"
                data-persona-camera-preview
              />
              {selfieRecording ? (
                <p className="mt-2 text-[13px] font-bold text-red-700">
                  {interpolate(g.selfieRecording, { seconds: String(selfieSeconds) })}
                </p>
              ) : null}
              <div className="mt-2 grid grid-cols-2 gap-2">
                {selfieRecording ? (
                  <button type="button" className={primaryClass} onClick={stopSelfieRecording} data-persona-selfie-stop>
                    {g.voiceStop}
                  </button>
                ) : (
                  <button type="button" className={primaryClass} onClick={startSelfieRecording} data-persona-selfie-record>
                    {g.selfieRecord}
                  </button>
                )}
                <button type="button" className={buttonClass} onClick={stopCamera} data-persona-camera-stop>
                  {g.cameraStop}
                </button>
              </div>
            </>
          ) : (
            <button type="button" className={`${primaryClass} mt-2`} onClick={startCamera} data-persona-camera-start>
              {g.cameraStart}
            </button>
          )}
          <div className="mt-3">
            <label className="grid gap-1 text-[13px] font-bold text-slate-800">
              {g.selfieUploadLabel}
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => void onFile("selfie", e.target.files?.[0] ?? null)}
                data-persona-file="selfie"
              />
            </label>
            {fileNotes.selfie ? (
              <p className="mt-1 text-[13px] text-slate-700" data-persona-file-note="selfie">
                {fileNotes.selfie}
              </p>
            ) : null}
          </div>
          {saveStates.selfie === "saving" ? (
            <p className="mt-2 text-[13px] font-bold text-slate-800" data-persona-selfie-saving>
              {g.fileSaving}
            </p>
          ) : null}
          {saveStates.selfie === "failed" ? (
            <p role="alert" className={`${alertClass} mt-2`} data-persona-selfie-save-error>
              {g.fileSaveFailed}
            </p>
          ) : null}
          {urls.selfie ? (
            <>

              <video controls src={urls.selfie} className="mt-2 max-h-56 w-full rounded-xl" data-persona-selfie-preview />
              <p className="mt-1 text-[13px] text-slate-700">{g.selfieSaved}</p>
            </>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className={buttonClass} onClick={() => setStep(prevPersonaStep(deposit, "biometry"))} data-persona-back>
              {g.back}
            </button>
            <button
              type="button"
              className={primaryClass}
              disabled={!personaStepSatisfied(deposit, "biometry") || finalizing}
              onClick={() => void finalize()}
              data-persona-finish
            >
              {g.finish}
            </button>
          </div>
        </section>
      ) : null}

      {step === "done" ? (
        <section className={cardClass} data-persona-step="done">
          <h3 className="text-[15px] font-extrabold text-slate-900">{g.doneTitle}</h3>
          <p className="mt-1 text-[13px] leading-snug text-slate-700">{g.doneLead}</p>
          <p className="mt-2 text-[13px] text-slate-800" data-persona-deposit-id>
            {g.depositNumber} : <strong>{deposit.id}</strong>
          </p>
          <p className="mt-1 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-wide text-amber-900" data-persona-status>
            {deposit.status === "retire" ? g.statusWithdrawn : g.statusReview}
          </p>
          <ul className="mt-3 grid gap-1 text-[13px] text-slate-800">
            {deposit.status === "retire" ? null : recapRows.map((row) => {
              const ok =
                row.kind === "consent" ? deposit.consent != null : deposit.media[row.kind] != null;
              return (
                <li key={row.label} className="flex items-center justify-between gap-2">
                  <span>{row.label}</span>
                  <span className={ok ? "font-bold text-emerald-700" : "font-bold text-red-700"}>
                    {ok ? "✓" : g.recapMissing}
                  </span>
                </li>
              );
            })}
          </ul>
          {deposit.status !== "retire" ? (
            <>
              <p className="mt-3 text-[13px] leading-snug text-slate-700" data-persona-upload-note data-persona-upload={deposit.upload}>
                {uploadNote}
              </p>
              {deposit.upload === "failed" || deposit.upload === "not-configured" ? (
                <button type="button" className={`${primaryClass} mt-2`} disabled={finalizing} onClick={() => void retryUpload()} data-persona-retry>
                  {g.retryUpload}
                </button>
              ) : null}
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3" data-persona-withdraw>
                <p className="text-[13px] font-extrabold text-red-900">{g.withdrawTitle}</p>
                <p className="mt-1 text-[13px] leading-snug text-red-900">{g.withdrawLead}</p>
                {withdrawAsk ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" className={buttonClass} onClick={() => setWithdrawAsk(false)} data-persona-withdraw-cancel>
                      {g.withdrawCancel}
                    </button>
                    <button type="button" className={primaryClass} onClick={() => void withdraw()} data-persona-withdraw-confirm>
                      {g.withdrawConfirm}
                    </button>
                  </div>
                ) : (
                  <button type="button" className={`${buttonClass} mt-2`} onClick={() => setWithdrawAsk(true)} data-persona-withdraw-button>
                    {g.withdrawButton}
                  </button>
                )}
              </div>
            </>
          ) : null}
          {withdrawNote ? (
            <p role="status" className="mt-2 text-[13px] font-bold text-slate-900" data-persona-withdraw-note>
              {withdrawNote}
            </p>
          ) : null}
          <button type="button" className={`${buttonClass} mt-3`} onClick={() => void startNewDeposit()} data-persona-new>
            {g.newDeposit}
          </button>
        </section>
      ) : null}
    </div>
  );
}

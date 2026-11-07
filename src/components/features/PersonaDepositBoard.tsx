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
 * as they are captured; only a metadata notice is POSTed, best-effort, to
 * the proposed /persona-deposits Worker route (inactive until Indiana
 * activates it — the dossier then simply stays complete on the device).
 */

import { useEffect, useRef, useState } from "react";
import { interpolate } from "@/lib/i18n/locales";
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
  PERSONA_AUDIO_MIME_CANDIDATES,
  PERSONA_COLLECTION_ENABLED,
  PERSONA_STEPS,
  PERSONA_VIDEO_MIME_CANDIDATES,
  pickRecorderMimeType,
  postPersonaDepositNotice,
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
  savePersonaMedia,
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
  const [step, setStep] = useState<PersonaStep>("consent");
  const [checks, setChecks] = useState<PersonaConsentChecks>(emptyPersonaConsentChecks());
  const [resumed, setResumed] = useState(false);
  const [urls, setUrls] = useState<MediaUrls>({});
  const [fileNotes, setFileNotes] = useState<Partial<Record<PersonaMediaKind, string>>>({});

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
        setChecks({ terms: true, adult: true, compensation: true });
      }
      // A complete-but-unfinalized dossier (app closed on the last step)
      // is deposited now: status « en vérification » + best-effort notice.
      if (personaFurthestStep(stored) === "done" && stored.status !== "en-verification") {
        void (async () => {
          const finished: PersonaDeposit = {
            ...stored,
            status: "en-verification",
            updatedAt: Date.now(),
          };
          const result = await postPersonaDepositNotice(finished);
          const withUpload: PersonaDeposit = { ...finished, upload: result };
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
        Object.values(next).forEach((u) => u && URL.revokeObjectURL(u));
        return;
      }
      setUrls((prev) => {
        Object.values(prev).forEach((u) => u && URL.revokeObjectURL(u));
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [deposit]);

  /* Revoke all preview URLs on unmount. */
  useEffect(() => {
    return () => {
      Object.values(urls).forEach((u) => u && URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Never sit on a step the deposit has not unlocked. */
  useEffect(() => {
    if (deposit && !canOpenPersonaStep(deposit, step)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp to the furthest unlocked step
      setStep(personaFurthestStep(deposit));
    }
  }, [deposit, step]);

  /* Stop streams/timers on unmount. */
  useEffect(() => {
    const voiceStream = voiceStreamRef;
    const selfieStream = selfieStreamRef;
    const voiceTimer = voiceTimerRef;
    const selfieTimer = selfieTimerRef;
    return () => {
      voiceStream.current?.getTracks().forEach((t) => t.stop());
      selfieStream.current?.getTracks().forEach((t) => t.stop());
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

  const stepIndex = PERSONA_STEPS.indexOf(step);
  const furthest = personaFurthestStep(deposit);

  function persist(next: PersonaDeposit) {
    savePersonaDeposit(next);
    setDeposit(next);
  }

  async function storeMedia(kind: PersonaMediaKind, blob: Blob) {
    if (!deposit) return;
    await savePersonaMedia(deposit.id, kind, blob);
    persist(
      recordPersonaMedia(deposit, kind, { type: blob.type || "application/octet-stream", size: blob.size }, Date.now()),
    );
  }

  /* ------------------------------------------------------------ */
  /* Consent gate                                                  */
  /* ------------------------------------------------------------ */
  function acceptConsent() {
    if (!deposit || !personaConsentComplete(checks)) return;
    persist(recordPersonaConsent(deposit, Date.now()));
    setStep("voice");
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        voiceStreamRef.current?.getTracks().forEach((t) => t.stop());
        voiceStreamRef.current = null;
      };
      voiceRecorderRef.current = recorder;
      recorder.start();
      setVoiceSeconds(0);
      setVoiceRecording(true);
      voiceTimerRef.current = setInterval(() => setVoiceSeconds((s) => s + 1), 1000);
    } catch {
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
    setFileNotes((prev) => ({ ...prev, [kind]: g.fileSaved }));
    await storeMedia(kind, file);
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
        audio: false,
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
    selfieStreamRef.current?.getTracks().forEach((t) => t.stop());
    selfieStreamRef.current = null;
    setCameraOn(false);
  }

  function startSelfieRecording() {
    const stream = selfieStreamRef.current;
    if (!stream) return;
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
    };
    selfieRecorderRef.current = recorder;
    recorder.start();
    setSelfieSeconds(0);
    setSelfieRecording(true);
    selfieTimerRef.current = setInterval(() => setSelfieSeconds((s) => s + 1), 1000);
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
    // Best-effort metadata notice — media never leave the device here.
    const result = await postPersonaDepositNotice(finished);
    const withUpload: PersonaDeposit = { ...finished, upload: result };
    persist(withUpload);
    setStep("done");
    setFinalizing(false);
  }

  async function startNewDeposit() {
    if (!deposit) return;
    for (const kind of Object.keys(deposit.media) as PersonaMediaKind[]) {
      await deletePersonaMedia(deposit.id, kind);
    }
    clearPersonaDeposit();
    setChecks(emptyPersonaConsentChecks());
    setFileNotes({});
    setResumed(false);
    const fresh = emptyPersonaDeposit(newPersonaDepositId(Date.now(), Math.random()), Date.now());
    setDeposit(fresh);
    setStep("consent");
  }

  const consentDate = deposit.consent
    ? new Date(deposit.consent.acceptedAt).toLocaleDateString(
        locale === "en" ? "en-CA" : locale === "es" ? "es" : "fr-CA",
      )
    : "";

  const recapRows: Array<{ label: string; kind: PersonaMediaKind | "consent" }> = [
    { label: g.recapConsent, kind: "consent" },
    { label: g.recapVoice, kind: "voice" },
    { label: g.recapImage, kind: "image" },
    { label: g.recapVideo, kind: "video" },
    { label: g.recapSelfie, kind: "selfie" },
  ];

  return (
    <div className="grid gap-3" data-persona-board>
      <p className="text-left text-sm leading-snug text-slate-600">{g.lead}</p>

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
          total: String(PERSONA_STEPS.length),
          name: g.stepNames[step],
        })}
      </p>

      {step === "consent" ? (
        <section className={cardClass} data-persona-step="consent">
          <h3 className="text-[15px] font-extrabold text-slate-900">{g.consentTitle}</h3>
          <p className="mt-1 text-[13px] leading-snug text-slate-700">{g.consentIntro}</p>
          {/* TEXTE PROVISOIRE — à remplacer par le formulaire de consentement d’Indiana Lane (IA). */}
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
            <button type="button" className={buttonClass} onClick={() => setStep("consent")} data-persona-back>
              {g.back}
            </button>
            <button
              type="button"
              className={primaryClass}
              disabled={!personaStepSatisfied(deposit, "voice") || voiceRecording}
              onClick={() => setStep("media")}
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
            <button type="button" className={buttonClass} onClick={() => setStep("voice")} data-persona-back>
              {g.back}
            </button>
            <button
              type="button"
              className={primaryClass}
              disabled={!personaStepSatisfied(deposit, "media")}
              onClick={() => setStep("biometry")}
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
          {urls.selfie ? (
            <>
              
              <video controls src={urls.selfie} className="mt-2 max-h-56 w-full rounded-xl" data-persona-selfie-preview />
              <p className="mt-1 text-[13px] text-slate-700">{g.selfieSaved}</p>
            </>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className={buttonClass} onClick={() => setStep("media")} data-persona-back>
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
            {g.statusReview}
          </p>
          <ul className="mt-3 grid gap-1 text-[13px] text-slate-800">
            {recapRows.map((row) => {
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
          <p className="mt-3 text-[13px] leading-snug text-slate-700" data-persona-upload-note>
            {deposit.upload === "sent" ? g.uploadSent : g.uploadPending}
          </p>
          <button type="button" className={`${buttonClass} mt-3`} onClick={() => void startNewDeposit()} data-persona-new>
            {g.newDeposit}
          </button>
        </section>
      ) : null}
    </div>
  );
}

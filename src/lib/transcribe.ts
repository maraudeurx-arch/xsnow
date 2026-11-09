/**
 * Reliable dictation client: the browser records the microphone
 * (MediaRecorder) and this module POSTs the raw audio to the
 * /opc/transcribe route (Workers AI Whisper), which returns the text.
 *
 * Replaces the browser's own speech recognition for the « Vendre mes
 * idées » form: Web Speech (webkitSpeechRecognition) is missing or
 * failing on the founder's iPhone, especially in the installed app —
 * tested live on 08/11/2026. Recording + server transcription works
 * wherever getUserMedia works.
 *
 * The route lives on the essaim-agents.com site Worker — NOT on this
 * app's xsnow-chat Worker: the site Worker deploys itself on every
 * merge (Workers Builds), while xsnow-chat needs a manual wrangler
 * deploy nobody on the team can run from here. Same Workers AI
 * binding on both sides, so the transcript quality is identical.
 */

/** Transcription can take a few seconds on the model side; allow more than the inbox posts. */
export const TRANSCRIBE_POST_TIMEOUT_MS = 30_000;

export type TranscribeErrorKind = "network" | "server" | "empty";

/** Typed failure so the dialog can pick the right localized message. */
export class TranscribeError extends Error {
  readonly kind: TranscribeErrorKind;
  constructor(kind: TranscribeErrorKind) {
    super(`transcribe_${kind}`);
    this.name = "TranscribeError";
    this.kind = kind;
  }
}

/** The transcription route lives on the essaim-agents.com site Worker (see header). */
export const TRANSCRIBE_FALLBACK_URL = "https://essaim-agents.com/opc/transcribe";

export function transcribeEndpoint(base?: string) {
  const origin = String(base ?? "").trim().replace(/\/+$/, "");
  return origin ? `${origin}/opc/transcribe` : TRANSCRIBE_FALLBACK_URL;
}

/** Reduce an interface locale ("fr-CA") to the Whisper hint ("fr"); "" = let the model detect. */
export function transcribeLanguageParam(locale: string): string {
  const base = String(locale ?? "").trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return /^[a-z]{2}$/.test(base) ? base : "";
}

/** Recording needs both getUserMedia and MediaRecorder (absent in some in-app browsers). */
export function recorderSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

/** Container candidates, best first: iOS Safari speaks mp4, Chrome/Android webm. */
export const RECORDER_MIME_CANDIDATES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

export function pickRecorderMimeType(
  isTypeSupported: (mimeType: string) => boolean = (mimeType) =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType),
): string | undefined {
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    try {
      if (isTypeSupported(candidate)) return candidate;
    } catch {
      // A throwing isTypeSupported just skips the candidate.
    }
  }
  return undefined;
}

/**
 * Send one recording to the Worker and return the transcript.
 * Throws TranscribeError: "network" (unreachable/aborted), "server"
 * (the route refused or failed), "empty" (nothing was heard).
 */
export async function transcribeAudio(
  audio: Blob,
  locale: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const lang = transcribeLanguageParam(locale);
  const url = lang ? `${transcribeEndpoint()}?lang=${encodeURIComponent(lang)}` : transcribeEndpoint();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSCRIBE_POST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": audio.type || "audio/mp4" },
      body: audio,
      credentials: "omit",
      signal: controller.signal,
    });
  } catch {
    throw new TranscribeError("network");
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new TranscribeError("server");
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    throw new TranscribeError("server");
  }
  const text =
    payload && typeof payload === "object" && typeof (payload as { text?: unknown }).text === "string"
      ? (payload as { text: string }).text.trim()
      : "";
  if (!text) throw new TranscribeError("empty");
  return text;
}

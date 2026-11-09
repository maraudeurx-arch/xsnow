/**
 * POST /transcribe — dictée fiable pour « Vendre mes idées » (et tout
 * formulaire qui en aura besoin). Le navigateur enregistre le micro
 * (MediaRecorder) et envoie l'audio brut ; le Worker le transcrit avec
 * Workers AI Whisper et renvoie { text }.
 *
 * Pourquoi pas la reconnaissance vocale du navigateur (Web Speech) ?
 * Testée en réel par le fondateur sur iPhone (08/11/2026) : absente ou
 * en échec, surtout en application installée. L'enregistrement +
 * transcription serveur fonctionne partout où un micro est accessible.
 *
 * Rien n'est stocké : l'audio transite en mémoire, seul le texte revient.
 */

export type TranscribeEnv = {
  AI: {
    run: (model: string, inputs: Record<string, unknown>) => Promise<unknown>;
  };
};

export type TranscribeRun = (model: string, inputs: Record<string, unknown>) => Promise<unknown>;

export const TRANSCRIBE_MODEL = "@cf/openai/whisper-large-v3-turbo";
/** ~8 Mo d'audio : très largement de quoi dicter une description de 340 caractères. */
export const TRANSCRIBE_MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export function isTranscribePath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/transcribe" || value.endsWith("/transcribe");
}

/**
 * Only audio bodies are transcribed. MediaRecorder produces audio/mp4
 * (iOS Safari), audio/webm (Chrome/Android), sometimes audio/ogg —
 * parameters (";codecs=opus") are stripped before the check.
 */
export function isAudioContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.split(";")[0]?.trim().toLowerCase().startsWith("audio/") ?? false;
}

/**
 * Whisper takes an ISO 639-1 language hint ("fr", "en", "es"…). The client
 * sends its interface language ("fr-CA", "en", "es") — reduce it to the
 * two-letter code, or return undefined so the model auto-detects.
 */
export function parseTranscribeLanguage(value: string | null): string | undefined {
  if (!value) return undefined;
  const base = value.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return /^[a-z]{2}$/.test(base) ? base : undefined;
}

/** Workers-safe base64 (chunked: String.fromCharCode on a huge array overflows the stack). */
export function audioBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
}

/** Whisper answers an object whose transcript lives in `text`. */
export function transcriptFromAi(payload: unknown): string {
  if (typeof payload === "string") return payload.trim();
  if (!payload || typeof payload !== "object") return "";
  const record = payload as { text?: unknown; result?: { text?: unknown } };
  if (typeof record.text === "string") return record.text.trim();
  if (typeof record.result?.text === "string") return record.result.text.trim();
  return "";
}

export type TranscribeInput = {
  audio: ArrayBuffer | Uint8Array;
  contentType: string | null;
  language: string | null;
};

export async function handleTranscribePost(
  input: TranscribeInput,
  env: TranscribeEnv,
  run: TranscribeRun = (model, inputs) => env.AI.run(model, inputs),
): Promise<{ status: number; data: Record<string, unknown> }> {
  const bytes = input.audio instanceof Uint8Array ? input.audio : new Uint8Array(input.audio);
  if (bytes.byteLength === 0) {
    return { status: 400, data: { error: "empty_audio" } };
  }
  if (bytes.byteLength > TRANSCRIBE_MAX_AUDIO_BYTES) {
    return { status: 400, data: { error: "payload_too_large" } };
  }
  if (!isAudioContentType(input.contentType)) {
    return { status: 400, data: { error: "unsupported_media_type" } };
  }
  const language = parseTranscribeLanguage(input.language);
  try {
    const payload = await run(TRANSCRIBE_MODEL, {
      audio: audioBytesToBase64(bytes),
      ...(language ? { language } : {}),
    });
    return { status: 200, data: { text: transcriptFromAi(payload) } };
  } catch {
    return { status: 500, data: { error: "transcription_failed" } };
  }
}

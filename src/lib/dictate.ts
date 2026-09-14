import { AVATAR_CHAT } from "@/lib/content";

export const DICTATION_LANGS = ["fr-CA", "fr-FR"] as const;
export type DictationLang = (typeof DICTATION_LANGS)[number];

export function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionCtor());
}

export function liveTranscript(event: SpeechRecognitionEventLike): {
  preview: string;
  committed: string;
} {
  let preview = "";
  let committed = "";
  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index];
    const piece = result?.[0]?.transcript ?? "";
    if (result?.isFinal) committed += piece;
    else preview += piece;
  }
  return {
    preview: `${committed} ${preview}`.replace(/\s+/g, " ").trim(),
    committed: committed.replace(/\s+/g, " ").trim(),
  };
}

export function dictationErrorCopy(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return AVATAR_CHAT.micDenied;
  }
  if (error === "audio-capture") return AVATAR_CHAT.micCapture;
  if (error === "no-speech") return AVATAR_CHAT.micNoSpeech;
  if (error === "network") return AVATAR_CHAT.networkError;
  if (error === "language-not-supported") return AVATAR_CHAT.micLangRetry;
  return AVATAR_CHAT.micGeneric;
}

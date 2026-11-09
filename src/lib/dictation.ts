export const DICTATION_LANGS = ["fr-CA", "fr-FR"] as const;

export type DictationErrorKind =
  | "unsupported"
  | "permission"
  | "silent"
  | "network"
  | "generic";

type RecognitionCtor = new () => BrowserSpeechRecognition;

export type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionError) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

export type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string };
  }>;
};

export type BrowserSpeechRecognitionError = {
  error: string;
};

export function getSpeechRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export function dictationSupported() {
  return Boolean(getSpeechRecognitionCtor());
}

/**
 * One-shot fallback for a language the browser refuses
 * (« language-not-supported »). Each spoken family has exactly one
 * fallback — the same one the dialogs historically retried with — and it
 * may be tried at most once per dictation start: the caller passes every
 * language already attempted, and this returns the fallback only when it
 * differs from the failed language and was never tried. Anything else
 * returns null, meaning « stop cleanly and show the mic error ».
 *
 * This guard exists because the previous retry flag was reset in
 * `onend` before relaunching: when the fallback itself was refused (or
 * was the language that had just failed), the error re-armed the flag
 * and recognition restarted forever, with no message ever shown
 * (Indiana Lane (IA), via Regie, 07/11/2026).
 */
const DICTATION_FALLBACK_BY_LANG: Readonly<Record<string, string>> = {
  "fr-CA": "fr-FR",
  "en-US": "en-GB",
  "en-CA": "en-GB",
  "es-ES": "es-MX",
  "es-US": "es-MX",
};

const DICTATION_FALLBACK_BY_FAMILY: Readonly<Record<string, string>> = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-MX",
};

export function dictationRetryLang(
  failedLang: string,
  triedLangs: readonly string[],
): string | null {
  const failed = (failedLang || "").trim();
  if (!failed) return null;
  const fallback =
    DICTATION_FALLBACK_BY_LANG[failed] ??
    DICTATION_FALLBACK_BY_FAMILY[failed.slice(0, 2).toLowerCase()] ??
    null;
  if (!fallback || fallback === failed) return null;
  if (triedLangs.includes(fallback)) return null;
  return fallback;
}

export function classifyDictationError(code: string): DictationErrorKind {
  if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
    return "permission";
  }
  if (code === "no-speech") return "silent";
  if (code === "network") return "network";
  if (code === "language-not-supported") return "unsupported";
  return "generic";
}

export function transcriptFromEvent(event: BrowserSpeechRecognitionEvent) {
  let text = "";
  let finalText = "";
  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const piece = result?.[0]?.transcript ?? "";
    text += piece;
    if (result?.isFinal) finalText += piece;
  }
  return {
    text: text.replace(/\s+/g, " ").trim(),
    finalText: finalText.replace(/\s+/g, " ").trim(),
  };
}

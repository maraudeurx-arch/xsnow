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

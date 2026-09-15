import type { VoiceGender } from "@/lib/avatars";

const FEMALE_HINT =
  /female|femme|f[eé]minin|woman|girl|sylvie|am[eé]lie|audrey|marie|julie|claire|denise|hortense|aria|florence|\bflo\b|l[eé]a|caroline|virginie|celeste|c[eé]leste|harriet|heera|anna|alice|camille|charlotte|chlo[eé]|emma|eva|jeanne|louise|lucie|margaux|nathalie|sophie|wavenet-[ace]|standard-[ace]|neural2-[ace]/i;

const MALE_HINT =
  /male|homme|masculin|man|boy|thomas|nicolas|henri|paul|daniel|jean|jacques|pierre|guillaume|bernard|fr[eé]d[eé]ric|horatio|\bfred\b|google fran[cç]ais(?!\s*2)|microsoft paul|microsoft henri|microsoft horatio|wavenet-[bdf]|standard-[bdf]|neural2-[bdf]/i;

function voiceBlob(voice: SpeechSynthesisVoice) {
  const extra = (voice as SpeechSynthesisVoice & { gender?: string }).gender ?? "";
  return `${voice.name} ${voice.voiceURI} ${voice.lang} ${extra}`.toLowerCase();
}

export function inferVoiceGender(voice: SpeechSynthesisVoice): VoiceGender | null {
  const blob = voiceBlob(voice);
  const explicit = (voice as SpeechSynthesisVoice & { gender?: string }).gender?.toLowerCase();
  if (explicit === "female" || explicit === "male") return explicit;
  if (FEMALE_HINT.test(blob)) return "female";
  if (MALE_HINT.test(blob)) return "male";
  return null;
}

/**
 * Soft locale preference for French TTS.
 * Regional French matching `localeHint` first, then any French.
 * English-majority cities (en-US) still stay on French voices — the app is French.
 */
function langScore(lang: string, localeHint: string) {
  const value = lang.toLowerCase();
  if (!value.startsWith("fr")) return 0;

  const hint = localeHint.toLowerCase();
  const preferred = hint.startsWith("fr-") ? hint.slice(0, 5) : "";

  if (preferred && value.startsWith(preferred)) return 4;
  if (hint.startsWith("fr-ca") || hint === "fr-ca") {
    if (value.startsWith("fr-ca")) return 4;
    if (value.startsWith("fr-fr")) return 2;
    return 1;
  }
  if (hint.startsWith("fr-fr") || hint.startsWith("fr-be") || hint.startsWith("fr-ch")) {
    if (value.startsWith("fr-fr")) return 4;
    if (value.startsWith("fr-ca")) return 2;
    return 1;
  }
  // US / other: still French, slight fr-CA then fr-FR preference.
  if (value.startsWith("fr-ca")) return 3;
  if (value.startsWith("fr-fr")) return 2;
  return 1;
}

function qualityScore(voice: SpeechSynthesisVoice) {
  const blob = voiceBlob(voice);
  if (/(am[eé]lie|audrey|thomas|hortense|marie|sylvie|julie|nicolas|henri|paul)/i.test(blob)) {
    return 2;
  }
  if (/google fran[cç]ais/.test(blob)) return 0;
  return 1;
}

function rankVoices(voices: SpeechSynthesisVoice[], localeHint: string) {
  return voices.slice().sort((left, right) => {
    const local = Number(right.localService) - Number(left.localService);
    if (local) return local;
    const lang = langScore(right.lang, localeHint) - langScore(left.lang, localeHint);
    if (lang) return lang;
    return qualityScore(right) - qualityScore(left);
  });
}

export function pickFrenchVoice(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender,
  localeHint = "fr-CA",
): SpeechSynthesisVoice | undefined {
  const french = voices.filter((voice) => voice.lang.toLowerCase().startsWith("fr"));
  if (!french.length) return undefined;

  const matching = french.filter((voice) => inferVoiceGender(voice) === gender);
  const localMatching = matching.filter((voice) => voice.localService);
  if (localMatching.length) return rankVoices(localMatching, localeHint)[0];
  if (matching.length) return rankVoices(matching, localeHint)[0];

  const notOpposite = french.filter((voice) => inferVoiceGender(voice) !== (gender === "male" ? "female" : "male"));
  const localNotOpposite = notOpposite.filter((voice) => voice.localService);
  if (localNotOpposite.length) return rankVoices(localNotOpposite, localeHint)[0];
  if (notOpposite.length) return rankVoices(notOpposite, localeHint)[0];

  return rankVoices(french, localeHint)[0];
}

export function pitchForGender(
  gender: VoiceGender,
  voice: SpeechSynthesisVoice | undefined,
) {
  const inferred = voice ? inferVoiceGender(voice) : null;
  if (gender === "female") {
    if (inferred === "female") return 1.04;
    if (inferred === "male") return 1.18;
    return 1.12;
  }
  if (inferred === "male") return 0.92;
  if (inferred === "female") return 0.78;
  return 0.88;
}

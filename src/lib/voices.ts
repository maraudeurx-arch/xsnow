import type { VoiceGender } from "@/lib/avatars";
import type { Locale } from "@/lib/i18n/locales";

const FEMALE_HINT =
  /female|femme|f[eé]minin|woman|girl|sylvie|am[eé]lie|audrey|marie|julie|claire|denise|hortense|aria|florence|\bflo\b|l[eé]a|caroline|virginie|celeste|c[eé]leste|harriet|heera|anna|alice|camille|charlotte|chlo[eé]|emma|eva|jeanne|louise|lucie|margaux|nathalie|sophie|samantha|victoria|karen|moira|tessa|monica|paulina|soledad|wavenet-[ace]|standard-[ace]|neural2-[ace]/i;

const MALE_HINT =
  /male|homme|masculin|man|boy|thomas|nicolas|henri|paul|daniel|jean|jacques|pierre|guillaume|bernard|fr[eé]d[eé]ric|horatio|\bfred\b|google fran[cç]ais(?!\s*2)|microsoft paul|microsoft henri|microsoft horatio|alex|daniel|jorge|juan|diego|wavenet-[bdf]|standard-[bdf]|neural2-[bdf]/i;

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
 * Prefer voices matching the UI language, then the place’s regional tag
 * (fr-CA, en-US, es-MX…). Never pick a different language first.
 */
function langScore(lang: string, uiLocale: Locale, regionHint: string) {
  const value = lang.toLowerCase();
  if (!value.startsWith(uiLocale)) return 0;

  const hint = regionHint.toLowerCase();
  const preferred =
    hint.startsWith(`${uiLocale}-`) ? hint.slice(0, 5) : spokenVoiceLang(uiLocale, regionHint).toLowerCase();

  if (preferred && value.startsWith(preferred)) return 4;
  if (value.startsWith(`${uiLocale}-`)) return 2;
  return 1;
}

function qualityScore(voice: SpeechSynthesisVoice) {
  const blob = voiceBlob(voice);
  if (/(am[eé]lie|audrey|thomas|hortense|marie|sylvie|julie|nicolas|henri|paul|samantha|alex|jorge|monica|paulina)/i.test(blob)) {
    return 2;
  }
  if (/google fran[cç]ais/.test(blob)) return 0;
  return 1;
}

function rankVoices(
  voices: SpeechSynthesisVoice[],
  uiLocale: Locale,
  regionHint: string,
) {
  return voices.slice().sort((left, right) => {
    const local = Number(right.localService) - Number(left.localService);
    if (local) return local;
    const lang = langScore(right.lang, uiLocale, regionHint) - langScore(left.lang, uiLocale, regionHint);
    if (lang) return lang;
    return qualityScore(right) - qualityScore(left);
  });
}

export function spokenVoiceLang(uiLocale: Locale, localeHint: string) {
  const hint = localeHint.toLowerCase();
  if (uiLocale === "fr") {
    if (hint.startsWith("fr-fr") || hint.startsWith("fr-be") || hint.startsWith("fr-ch")) {
      return "fr-FR";
    }
    return "fr-CA";
  }
  if (uiLocale === "en") {
    if (hint.startsWith("en-gb") || hint.startsWith("en-uk")) return "en-GB";
    if (hint.startsWith("en-ca") || hint === "fr-ca" || hint.endsWith("-ca")) return "en-CA";
    return "en-US";
  }
  if (hint.startsWith("es-mx") || hint === "mx") return "es-MX";
  if (hint.startsWith("es-us") || hint === "en-us" || hint.endsWith("-us")) return "es-US";
  return "es-ES";
}

export function pickSpokenVoice(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender,
  uiLocale: Locale,
  localeHint = "",
): SpeechSynthesisVoice | undefined {
  const pool = voices.filter((voice) => voice.lang.toLowerCase().startsWith(uiLocale));
  if (!pool.length) return undefined;

  const matching = pool.filter((voice) => inferVoiceGender(voice) === gender);
  const localMatching = matching.filter((voice) => voice.localService);
  if (localMatching.length) return rankVoices(localMatching, uiLocale, localeHint)[0];
  if (matching.length) return rankVoices(matching, uiLocale, localeHint)[0];

  const notOpposite = pool.filter((voice) => inferVoiceGender(voice) !== (gender === "male" ? "female" : "male"));
  const localNotOpposite = notOpposite.filter((voice) => voice.localService);
  if (localNotOpposite.length) return rankVoices(localNotOpposite, uiLocale, localeHint)[0];
  if (notOpposite.length) return rankVoices(notOpposite, uiLocale, localeHint)[0];

  return rankVoices(pool, uiLocale, localeHint)[0];
}

/** @deprecated use pickSpokenVoice — kept so older tests/call sites still compile. */
export function pickFrenchVoice(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender,
  localeHint = "fr-CA",
) {
  return pickSpokenVoice(voices, gender, "fr", localeHint);
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

export function dictationLang(uiLocale: Locale, localeHint: string): string {
  return spokenVoiceLang(uiLocale, localeHint);
}

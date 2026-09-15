import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import type { Messages } from "./messages";

export type { Messages } from "./messages";

export const DICTIONARIES: Record<Locale, Messages> = {
  fr,
  en,
  es,
};

export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export {
  DEFAULT_LOCALE,
  LANG_STORAGE_KEY,
  LOCALES,
  browserLanguages,
  detectLocale,
  interpolate,
  isLocale,
  parseLangOverride,
  readStoredLocale,
  writeStoredLocale,
  type Locale,
} from "./locales";

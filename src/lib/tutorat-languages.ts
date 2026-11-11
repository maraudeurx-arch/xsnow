/** Languages a person can ask to learn through OPC tutoring (in preparation). */

export const TUTORAT_LEARN_LANGUAGES = ["francais", "anglais", "espagnol"] as const;

export type TutoratLearnLanguage = (typeof TUTORAT_LEARN_LANGUAGES)[number];

export function isTutoratLearnLanguage(value: string): value is TutoratLearnLanguage {
  return (TUTORAT_LEARN_LANGUAGES as readonly string[]).includes(value);
}

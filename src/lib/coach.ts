/**
 * Avatar coach: two questions, then 3–5 in-app paths.
 * Never promises income, salary, or guaranteed earnings.
 */

export const COACH_KEY = "xsnow.coach";

export const COACH_QUESTION_IDS = ["intent", "time"] as const;
export type CoachQuestionId = (typeof COACH_QUESTION_IDS)[number];

export const COACH_INTENT_IDS = ["help", "skill", "business", "explore"] as const;
export type CoachIntentId = (typeof COACH_INTENT_IDS)[number];

export const COACH_TIME_IDS = ["yes", "little", "later"] as const;
export type CoachTimeId = (typeof COACH_TIME_IDS)[number];

export const COACH_PATH_IDS = ["skills", "demand", "ideas", "pubs", "earn"] as const;
export type CoachPathId = (typeof COACH_PATH_IDS)[number];

export const COACH_PATH_HREF: Record<CoachPathId, string> = {
  skills: "/mes-services?template=skills",
  demand: "/en-demande",
  ideas: "/vos-idees/#form",
  pubs: "/pubs",
  earn: "/gagner-maintenant",
};

export type CoachAnswers = {
  intent?: CoachIntentId;
  time?: CoachTimeId;
};

const INCOME_PROMISE_RE =
  /revenu\s+garanti|salaire\s+garanti|guaranteed\s+(income|salary|earnings)|ingreso\s+garantizado|ganarás|you\s+will\s+earn|tu\s+gagneras|revenu\s+assuré|income\s+is\s+guaranteed/i;

export function isCoachIntentId(value: unknown): value is CoachIntentId {
  return typeof value === "string" && (COACH_INTENT_IDS as readonly string[]).includes(value);
}

export function isCoachTimeId(value: unknown): value is CoachTimeId {
  return typeof value === "string" && (COACH_TIME_IDS as readonly string[]).includes(value);
}

export function isCoachPathId(value: unknown): value is CoachPathId {
  return typeof value === "string" && (COACH_PATH_IDS as readonly string[]).includes(value);
}

export function parseCoachAnswers(raw: unknown): CoachAnswers {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as { intent?: unknown; time?: unknown };
  const next: CoachAnswers = {};
  if (isCoachIntentId(record.intent)) next.intent = record.intent;
  if (isCoachTimeId(record.time)) next.time = record.time;
  return next;
}

export function nextCoachQuestion(answers: CoachAnswers): CoachQuestionId | null {
  if (!answers.intent) return "intent";
  if (!answers.time) return "time";
  return null;
}

export function coachComplete(answers: CoachAnswers): boolean {
  return Boolean(answers.intent && answers.time);
}

/**
 * Rank 4–5 paths from the answers. Always at least 3, never more than 5.
 * Intent changes order; time never drops a path or invents earnings.
 */
export function rankCoachPaths(answers: CoachAnswers): CoachPathId[] {
  const byIntent: Record<CoachIntentId, CoachPathId[]> = {
    help: ["demand", "skills", "ideas", "pubs", "earn"],
    skill: ["skills", "demand", "ideas", "pubs", "earn"],
    business: ["pubs", "ideas", "skills", "demand", "earn"],
    explore: ["ideas", "pubs", "skills", "demand", "earn"],
  };
  const ranked = answers.intent ? [...byIntent[answers.intent]] : [...byIntent.explore];
  if (answers.time === "later") {
    const ideas = ranked.filter((id) => id === "ideas");
    const rest = ranked.filter((id) => id !== "ideas");
    return [...ideas, ...rest].slice(0, 5);
  }
  return ranked.slice(0, 5);
}

export function promisesIncome(text: string): boolean {
  return INCOME_PROMISE_RE.test(text);
}

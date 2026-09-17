/**
 * Neighbourhood skills listing (Mes compétences).
 * Stored as a published community offer (same localStorage list as other Mes services).
 * Visitor-authored “Autres” text is plain text only.
 */

import { WEEKDAYS, isWeekday, type Weekday } from "./proximity-alerts.ts";
import { TITLE_TEXT_MAX, sanitizeUntrustedText } from "./sanitize.ts";

export const SKILL_IDS = [
  "mechanic",
  "plumber",
  "electrician",
  "driver",
  "other",
] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export { WEEKDAYS, type Weekday };

export const SKILL_OTHER_MAX = 80;
export const DEFAULT_SKILLS_FROM = "08:00";
export const DEFAULT_SKILLS_TO = "18:00";
export const DEFAULT_SKILLS_TITLE = "Mes compétences";
export const DEFAULT_SKILLS_PRICE_CAD = 0;

export type SkillFormIssue = "skills" | "other" | "days" | "hours";

export function isSkillId(value: unknown): value is SkillId {
  return typeof value === "string" && (SKILL_IDS as readonly string[]).includes(value);
}

export function parseSkillIds(raw: unknown): SkillId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<SkillId>();
  for (const item of raw) {
    if (isSkillId(item)) seen.add(item);
  }
  return SKILL_IDS.filter((id) => seen.has(id));
}

export function parseAvailabilityDays(raw: unknown): Weekday[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<Weekday>();
  for (const item of raw) {
    if (isWeekday(item)) seen.add(item);
  }
  return WEEKDAYS.filter((day) => seen.has(day));
}

export function sanitizeSkillOther(raw: unknown): string {
  const text = sanitizeUntrustedText(raw, {
    max: SKILL_OTHER_MAX,
    redactEmails: true,
    allowNewlines: false,
  });
  if (!text || text === "[redacted]") return "";
  return text;
}

export function skillFormIssues(input: {
  skillIds?: readonly string[];
  skillOther?: string;
  availabilityDays?: readonly string[];
  windowFrom?: string;
  windowTo?: string;
}): SkillFormIssue[] {
  const ids = parseSkillIds(input.skillIds);
  const days = parseAvailabilityDays(input.availabilityDays);
  const issues: SkillFormIssue[] = [];
  if (!ids.length) issues.push("skills");
  if (ids.includes("other") && !sanitizeSkillOther(input.skillOther)) issues.push("other");
  if (!days.length) issues.push("days");
  const from = String(input.windowFrom || "").slice(0, 5);
  const to = String(input.windowTo || "").slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) issues.push("hours");
  return issues;
}

export function canPublishSkills(input: {
  skillIds?: readonly string[];
  skillOther?: string;
  availabilityDays?: readonly string[];
  windowFrom?: string;
  windowTo?: string;
}) {
  return skillFormIssues(input).length === 0;
}

/** French fallback title used when the UI does not supply a localized one. */
export function skillsFallbackTitle(ids: SkillId[], other: string) {
  const labels: Record<SkillId, string> = {
    mechanic: "Mécanicien",
    plumber: "Plombier",
    electrician: "Électricien",
    driver: "Chauffeur",
    other: "Autres",
  };
  const parts = ids.map((id) => (id === "other" && other ? other : labels[id]));
  const title = parts.join(", ") || DEFAULT_SKILLS_TITLE;
  return sanitizeUntrustedText(title, {
    max: TITLE_TEXT_MAX,
    redactEmails: true,
    allowNewlines: false,
  }) || DEFAULT_SKILLS_TITLE;
}

export function skillsNotes(days: Weekday[], other: string) {
  const dayLine = days.length ? days.join(",") : "";
  const extra = other ? `Autres: ${other}` : "";
  return sanitizeUntrustedText([dayLine, extra].filter(Boolean).join(" · "), {
    max: 200,
    redactEmails: true,
    allowNewlines: false,
  });
}

/**
 * Local community ideas (tête / cœur / mains). Persist on-device.
 * Optional analytics: anonymized `monetize_suggestion` via existing /stats.
 */

import { PUBLIC_SITE_URL } from "./paths.ts";
import { uid } from "./storage.ts";

export const IDEAS_KEY = "xsnow.ideas";
export const IDEA_DRAFT_KEY = "xsnow.ideaDraft";
export const IDEA_SHARE_PREFIX = "opc-idea-share:";
export const IDEA_TEXT_MAX = 500;
export const IDEA_TEXT_MIN = 3;
export const IDEA_HOURS_MAX = 16;
export const IDEA_NEIGHBORHOOD_MAX = 80;

export const INVOLVEMENT = ["tete", "coeur", "mains"] as const;
export type Involvement = (typeof INVOLVEMENT)[number];

export type CommunityIdea = {
  id: string;
  text: string;
  involvement: Involvement[];
  hoursPerWeek: string;
  neighborhood: string;
  createdAt: string;
  updatedAt: string;
};

export type IdeaFormInput = {
  text: string;
  involvement: Involvement[];
  hoursPerWeek: string;
  neighborhood: string;
};

export type IdeaShareLabels = {
  heading: string;
  involvement: Record<Involvement, string>;
  hours: string;
  neighborhood: string;
};

const IDEA_CHAT_NEEDLES = [
  "une idee",
  "mon idee",
  "vos idees",
  "des idees",
  "my idea",
  "an idea",
  "your ideas",
  "una idea",
  "mi idea",
  "tus ideas",
  "s impliquer",
  "simpliquer",
  "impliquer",
  "get involved",
  "implicarme",
  "involucr",
];

export function emptyIdeaForm(): IdeaFormInput {
  return { text: "", involvement: [], hoursPerWeek: "", neighborhood: "" };
}

export function isInvolvement(value: unknown): value is Involvement {
  return value === "tete" || value === "coeur" || value === "mains";
}

export function parseInvolvement(raw: unknown): Involvement[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<Involvement>();
  for (const item of raw) {
    if (isInvolvement(item) && !seen.has(item)) seen.add(item);
  }
  return INVOLVEMENT.filter((key) => seen.has(key));
}

export function clipIdeaText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, IDEA_TEXT_MAX);
}

export function clipHours(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, IDEA_HOURS_MAX);
}

export function clipNeighborhood(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, IDEA_NEIGHBORHOOD_MAX);
}

export function toggleInvolvement(current: Involvement[], key: Involvement): Involvement[] {
  return current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
}

export type IdeaFormIssue = "text" | "involvement";

export function ideaFormIssues(form: IdeaFormInput): IdeaFormIssue[] {
  const issues: IdeaFormIssue[] = [];
  if (clipIdeaText(form.text).length < IDEA_TEXT_MIN) issues.push("text");
  if (!parseInvolvement(form.involvement).length) issues.push("involvement");
  return issues;
}

export function ideaFromForm(form: IdeaFormInput, existing?: CommunityIdea): CommunityIdea {
  const now = new Date().toISOString();
  return {
    id: existing?.id || uid(),
    text: clipIdeaText(form.text),
    involvement: parseInvolvement(form.involvement),
    hoursPerWeek: clipHours(form.hoursPerWeek),
    neighborhood: clipNeighborhood(form.neighborhood),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

export function formFromIdea(idea: CommunityIdea): IdeaFormInput {
  return {
    text: idea.text,
    involvement: [...idea.involvement],
    hoursPerWeek: idea.hoursPerWeek,
    neighborhood: idea.neighborhood,
  };
}

export function parseStoredIdea(raw: unknown): CommunityIdea | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const text = typeof record.text === "string" ? clipIdeaText(record.text) : "";
  if (text.length < IDEA_TEXT_MIN) return null;
  const involvement = parseInvolvement(record.involvement);
  if (!involvement.length) return null;
  const id = typeof record.id === "string" && record.id.trim() ? record.id.trim().slice(0, 80) : uid();
  const createdAt =
    typeof record.createdAt === "string" && record.createdAt ? record.createdAt : new Date().toISOString();
  const updatedAt =
    typeof record.updatedAt === "string" && record.updatedAt ? record.updatedAt : createdAt;
  return {
    id,
    text,
    involvement,
    hoursPerWeek: typeof record.hoursPerWeek === "string" ? clipHours(record.hoursPerWeek) : "",
    neighborhood: typeof record.neighborhood === "string" ? clipNeighborhood(record.neighborhood) : "",
    createdAt,
    updatedAt,
  };
}

export function looksLikeCommunityIdea(text: string) {
  const folded = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ");
  if (!folded.trim()) return false;
  return IDEA_CHAT_NEEDLES.some((needle) => folded.includes(needle));
}

export function analyticsSnippet(idea: CommunityIdea) {
  const tags = idea.involvement.join("+");
  const hours = idea.hoursPerWeek ? ` ${idea.hoursPerWeek}h` : "";
  const place = idea.neighborhood ? ` @${idea.neighborhood}` : "";
  return `[${tags}${hours}${place}] ${idea.text}`;
}

function shareTextKey(id: string) {
  return `${IDEA_SHARE_PREFIX}${id}`;
}

export function readEditedIdeaShare(id: string) {
  if (typeof window === "undefined" || !id) return "";
  try {
    return window.localStorage.getItem(shareTextKey(id)) || "";
  } catch {
    return "";
  }
}

export function writeEditedIdeaShare(id: string, text: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    window.localStorage.setItem(shareTextKey(id), text);
  } catch {
    // Private mode / quota
  }
}

export function defaultIdeaShareText(idea: CommunityIdea, labels: IdeaShareLabels) {
  const lines = [
    labels.heading,
    idea.text,
    idea.involvement.map((key) => labels.involvement[key]).filter(Boolean).join(" · "),
  ];
  if (idea.hoursPerWeek) lines.push(`${labels.hours}: ${idea.hoursPerWeek}`);
  if (idea.neighborhood) lines.push(`${labels.neighborhood}: ${idea.neighborhood}`);
  lines.push(`${PUBLIC_SITE_URL.replace(/\/+$/, "")}/vos-idees/`);
  return lines.filter(Boolean).join("\n");
}

export function draftIdeaShareText(idea: CommunityIdea, labels: IdeaShareLabels) {
  const saved = readEditedIdeaShare(idea.id);
  if (saved.trim()) return saved;
  return defaultIdeaShareText(idea, labels);
}

export function readIdeaDraft() {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.sessionStorage.getItem(IDEA_DRAFT_KEY);
    return typeof raw === "string" ? clipIdeaText(raw) : "";
  } catch {
    return "";
  }
}

export function writeIdeaDraft(text: string) {
  if (typeof window === "undefined") return;
  try {
    const clipped = clipIdeaText(text);
    if (!clipped) {
      window.sessionStorage.removeItem(IDEA_DRAFT_KEY);
      return;
    }
    window.sessionStorage.setItem(IDEA_DRAFT_KEY, clipped);
  } catch {
    // Private mode / quota
  }
}

export function clearIdeaDraft() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(IDEA_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export const WORKER_SYSTEM_PROMPT_MAX = 4000;

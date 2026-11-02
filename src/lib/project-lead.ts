/**
 * « Chef de projet » — interest form for OPC members who want to follow one
 * client project end to end (writing and updating the client AI's rules).
 * Reuses the Vos idées inbox (same Worker, same e-mail to the team): the
 * application is flattened into a short tagged text. No phone, no e-mail,
 * no name leaves the device here.
 */
import { IDEA_TEXT_MAX } from "./ideas.ts";

export const PROJECT_LEAD_TAG = "[Chef de projet]";
export const PROJECT_LEAD_FIELD_MAX = 120;

export type ProjectLeadForm = {
  country: string;
  languages: string;
  hours: string;
  motivation: string;
  adult: boolean;
  confidentiality: boolean;
};

export function emptyProjectLeadForm(): ProjectLeadForm {
  return { country: "", languages: "", hours: "", motivation: "", adult: false, confidentiality: false };
}

function clipField(value: unknown, max = PROJECT_LEAD_FIELD_MAX) {
  return String(value ?? "").replace(/[\r\n\t|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export type ProjectLeadIssue = "country" | "languages" | "adult" | "confidentiality";

export function projectLeadIssues(form: ProjectLeadForm): ProjectLeadIssue[] {
  const issues: ProjectLeadIssue[] = [];
  if (clipField(form.country).length < 2) issues.push("country");
  if (clipField(form.languages).length < 2) issues.push("languages");
  if (form.adult !== true) issues.push("adult");
  if (form.confidentiality !== true) issues.push("confidentiality");
  return issues;
}

/** Flatten an application into the idea-inbox text (≤ IDEA_TEXT_MAX). */
export function projectLeadInboxText(form: ProjectLeadForm): string {
  const parts = [
    PROJECT_LEAD_TAG,
    `Pays: ${clipField(form.country, 60)}`,
    `Langues: ${clipField(form.languages, 80)}`,
    `Dispo h/sem: ${clipField(form.hours, 20) || "?"}`,
    "18+: oui",
    "Confidentialité: oui",
  ];
  const motivation = clipField(form.motivation, 300);
  if (motivation) parts.push(`Motivation: ${motivation}`);
  return parts.join(" | ").slice(0, IDEA_TEXT_MAX);
}

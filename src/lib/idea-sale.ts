/**
 * « Vendre mes idées » — proposal form for OPC members who want to sell an
 * idea or a creation (business; entertainment and creations — film or TV
 * screenplays, comics, music, songs; other). Every proposal is read by the
 * Essaim-Agents team (Indiana Lane (IA), Yves Knicks (IA) and the founder);
 * approved ideas are graded by the team and listed in the « Idées en vente »
 * catalogue of the Clé en Main app. If an idea sells, its author receives a
 * compensation set by the team — no amount or percentage is promised here.
 * The idea stays its author's until it is sold.
 *
 * Routing reuses the two existing owner-inbox channels, exactly like the
 * closest forms (« Chef de projet » for the proposal, profile save for the
 * contact):
 * - the proposal itself goes to the Vos idées inbox (same Worker, same
 *   e-mail to the team), flattened into a short tagged text. That inbox is
 *   a no-PII channel by design — it redacts e-mails — so the text carries
 *   only the title, the category, the description and the OPC id beside it;
 * - the seller's name and e-mail (form fields, covered by the mandatory
 *   consent checkbox) reach the same team inbox through the register
 *   notice, keyed by the OPC id, so the team can reply about the review
 *   and any sale.
 * No payment is involved anywhere in OPC.
 */
import { IDEA_TEXT_MAX } from "./ideas.ts";

export const IDEA_SALE_TAG = "[Idée à vendre]";

export const IDEA_SALE_CATEGORIES = ["affaires", "divertissement", "autre"] as const;
export type IdeaSaleCategory = (typeof IDEA_SALE_CATEGORIES)[number];

/** French labels used in the team inbox text (the team reads French). */
export const IDEA_SALE_CATEGORY_LABELS_FR: Record<IdeaSaleCategory, string> = {
  affaires: "Affaires",
  divertissement: "Divertissement et création",
  autre: "Autre",
};

export const IDEA_SALE_TITLE_MAX = 60;
export const IDEA_SALE_DESCRIPTION_MAX = 340;
export const IDEA_SALE_DESCRIPTION_MIN = 20;
/** Target length the summary prompt asks the model to stay within. */
export const IDEA_SALE_SUMMARY_MAX = 320;
export const IDEA_SALE_NAME_MAX = 40;
export const IDEA_SALE_EMAIL_MAX = 60;

export type IdeaSaleForm = {
  title: string;
  category: IdeaSaleCategory;
  description: string;
  name: string;
  email: string;
  consent: boolean;
};

export function emptyIdeaSaleForm(): IdeaSaleForm {
  return { title: "", category: "affaires", description: "", name: "", email: "", consent: false };
}

function clipField(value: unknown, max: number) {
  return String(value ?? "").replace(/[\r\n\t|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type IdeaSaleIssue = "title" | "category" | "description" | "name" | "email" | "consent";

export function ideaSaleIssues(form: IdeaSaleForm): IdeaSaleIssue[] {
  const issues: IdeaSaleIssue[] = [];
  if (clipField(form.title, IDEA_SALE_TITLE_MAX).length < 3) issues.push("title");
  if (!IDEA_SALE_CATEGORIES.includes(form.category)) issues.push("category");
  if (clipField(form.description, IDEA_SALE_DESCRIPTION_MAX).length < IDEA_SALE_DESCRIPTION_MIN) issues.push("description");
  if (clipField(form.name, IDEA_SALE_NAME_MAX).length < 2) issues.push("name");
  if (!EMAIL_RE.test(clipField(form.email, IDEA_SALE_EMAIL_MAX))) issues.push("email");
  if (form.consent !== true) issues.push("consent");
  return issues;
}

/**
 * Append a final dictation transcript to the description being written:
 * the spoken words join what is already there (one separating space, none
 * when the text already ends with whitespace) and the result never exceeds
 * IDEA_SALE_DESCRIPTION_MAX characters — the overflow is cut cleanly.
 */
export function appendDictationToDescription(current: string, transcript: string): string {
  const piece = String(transcript ?? "").replace(/\s+/g, " ").trim();
  const base = String(current ?? "");
  if (!piece) return base;
  const joined = base ? `${base}${/\s$/.test(base) ? "" : " "}${piece}` : piece;
  return joined.slice(0, IDEA_SALE_DESCRIPTION_MAX);
}

/** Flatten a proposed summary into a valid one-line description (≤ max). */
export function clipIdeaSaleSummary(text: string): string {
  return String(text ?? "").replace(/\s+/g, " ").trim().slice(0, IDEA_SALE_DESCRIPTION_MAX);
}

const SUMMARY_SYSTEM_PROMPTS: Record<"fr" | "en" | "es", string> = {
  fr: `Tu aides une personne à décrire une idée qu'elle veut vendre sur Open Community. Reformule son idée en un résumé clair et bien formulé, de ${IDEA_SALE_SUMMARY_MAX} caractères au maximum, qui dit ce qu'est l'idée, à qui elle s'adresse et pourquoi elle marcherait. Réponds uniquement par le résumé, sans préambule, sans titre et sans guillemets.`,
  en: `You help a person describe an idea they want to sell on Open Community. Rewrite their idea as a clear, well-worded summary of at most ${IDEA_SALE_SUMMARY_MAX} characters, saying what the idea is, who it is for and why it would work. Reply with the summary only, with no preamble, no heading and no quotation marks.`,
  es: `Ayudas a una persona a describir una idea que quiere vender en Open Community. Reformula su idea en un resumen claro y bien redactado, de ${IDEA_SALE_SUMMARY_MAX} caracteres como máximo, que diga qué es la idea, a quién va dirigida y por qué funcionaría. Responde únicamente con el resumen, sin preámbulo, sin título y sin comillas.`,
};

/** System prompt for the « Résumer mon idée » rewrite, in the UI language. */
export function ideaSaleSummarySystemPrompt(locale: string): string {
  if (locale.startsWith("en")) return SUMMARY_SYSTEM_PROMPTS.en;
  if (locale.startsWith("es")) return SUMMARY_SYSTEM_PROMPTS.es;
  return SUMMARY_SYSTEM_PROMPTS.fr;
}

/**
 * Flatten a proposal into the idea-inbox text (≤ IDEA_TEXT_MAX).
 * No name, no e-mail here: the ideas inbox redacts e-mails by design.
 * The seller's contact travels by the register notice (see file header).
 */
export function ideaSaleInboxText(form: IdeaSaleForm): string {
  const parts = [
    IDEA_SALE_TAG,
    `Titre: ${clipField(form.title, IDEA_SALE_TITLE_MAX)}`,
    `Catégorie: ${IDEA_SALE_CATEGORY_LABELS_FR[form.category] ?? IDEA_SALE_CATEGORY_LABELS_FR.autre}`,
    `Description: ${clipField(form.description, IDEA_SALE_DESCRIPTION_MAX)}`,
    "Accord: oui",
  ];
  return parts.join(" | ").slice(0, IDEA_TEXT_MAX);
}

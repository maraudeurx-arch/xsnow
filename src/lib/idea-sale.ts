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
  if (clipField(form.description, IDEA_SALE_DESCRIPTION_MAX).length < 20) issues.push("description");
  if (clipField(form.name, IDEA_SALE_NAME_MAX).length < 2) issues.push("name");
  if (!EMAIL_RE.test(clipField(form.email, IDEA_SALE_EMAIL_MAX))) issues.push("email");
  if (form.consent !== true) issues.push("consent");
  return issues;
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

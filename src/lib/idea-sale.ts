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
 *   only the title, the category, the approved summary (as description),
 *   the seller's desired price in US dollars (not personal information)
 *   and the OPC id beside it;
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
/**
 * The working description (typed or dictated) stays capped at
 * IDEA_SALE_DESCRIPTION_MAX, but what actually travels to the team is the
 * summary below: the seller dictates or types freely (within 340), the app
 * proposes an extractive summary, the seller edits and approves it, and the
 * approved summary is sent as the proposal's description (Popol, 07/11/2026).
 */
export const IDEA_SALE_SUMMARY_MAX = 280;
export const IDEA_SALE_NAME_MAX = 40;
export const IDEA_SALE_EMAIL_MAX = 60;
export const IDEA_SALE_PRICE_MAX_USD = 100_000_000;

/**
 * Intro video for this section (Popol, 07/11/2026): some people have plenty
 * of ideas and no means to build them, others have tools and funds but no
 * ideas — OPC brings them together. One produced file per form language
 * under public/videos/ (narration ≈ 45 s, OPC logo card at the end;
 * approved by Popol on 07/11/2026). ideaSaleVideoSrc picks the file for
 * the form's language and falls back to FR, so the dialog never renders
 * an empty player (sobriety rule).
 */
export const IDEA_SALE_VIDEO_SRCS = {
  fr: "/videos/video-idees-opc-fr.mp4",
  en: "/videos/video-idees-opc-en.mp4",
  es: "/videos/video-idees-opc-es.mp4",
} as const;

export function ideaSaleVideoSrc(locale: string): string {
  switch (locale) {
    case "en":
      return IDEA_SALE_VIDEO_SRCS.en;
    case "es":
      return IDEA_SALE_VIDEO_SRCS.es;
    default:
      return IDEA_SALE_VIDEO_SRCS.fr;
  }
}

export type IdeaSaleForm = {
  title: string;
  category: IdeaSaleCategory;
  description: string;
  summary: string;
  summaryApproved: boolean;
  /** Desired selling price, raw input (parsed by parseIdeaSalePrice), in US dollars. */
  price: string;
  name: string;
  email: string;
  consent: boolean;
};

export function emptyIdeaSaleForm(): IdeaSaleForm {
  return {
    title: "",
    category: "affaires",
    description: "",
    summary: "",
    summaryApproved: false,
    price: "",
    name: "",
    email: "",
    consent: false,
  };
}

/**
 * Extractive summary of the working description: whole sentences, in order,
 * until IDEA_SALE_SUMMARY_MAX; if the first sentence alone is longer, it is
 * clipped at a word boundary. Deterministic and fully local — no network,
 * no AI call — and always presented to the seller as a proposal to edit.
 */
export function proposeIdeaSummary(description: unknown, max: number = IDEA_SALE_SUMMARY_MAX): string {
  const clean = String(description ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  const sentences = (clean.match(/[^.!?…]*[.!?…]+["»”)]*|[^.!?…]+$/g) ?? [clean])
    .map((s) => s.trim())
    .filter(Boolean);
  let out = "";
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > max) break;
    out = next;
  }
  if (!out) {
    const slice = clean.slice(0, max);
    const lastSpace = slice.lastIndexOf(" ");
    out = (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim();
  }
  return out;
}

/**
 * Parse the seller's desired price (US dollars). Accepts spaces as thousand
 * separators and a comma or dot decimal separator, at most two decimals.
 * Returns null for anything that is not a positive amount.
 */
export function parseIdeaSalePrice(raw: unknown): number | null {
  const cleaned = String(raw ?? "").replace(/[\s  ]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0 || value > IDEA_SALE_PRICE_MAX_USD) return null;
  return value;
}

export function formatIdeaSalePrice(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function clipField(value: unknown, max: number) {
  return String(value ?? "").replace(/[\r\n\t|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type IdeaSaleIssue =
  | "title"
  | "category"
  | "description"
  | "summary"
  | "price"
  | "name"
  | "email"
  | "consent";

export function ideaSaleIssues(form: IdeaSaleForm): IdeaSaleIssue[] {
  const issues: IdeaSaleIssue[] = [];
  if (clipField(form.title, IDEA_SALE_TITLE_MAX).length < 3) issues.push("title");
  if (!IDEA_SALE_CATEGORIES.includes(form.category)) issues.push("category");
  if (clipField(form.description, IDEA_SALE_DESCRIPTION_MAX).length < 20) issues.push("description");
  // No send without an approved summary: it is the text the team receives.
  if (clipField(form.summary, IDEA_SALE_SUMMARY_MAX).length < 20 || form.summaryApproved !== true) {
    issues.push("summary");
  }
  if (parseIdeaSalePrice(form.price) === null) issues.push("price");
  if (clipField(form.name, IDEA_SALE_NAME_MAX).length < 2) issues.push("name");
  if (!EMAIL_RE.test(clipField(form.email, IDEA_SALE_EMAIL_MAX))) issues.push("email");
  if (form.consent !== true) issues.push("consent");
  return issues;
}

/**
 * Flatten a proposal into the idea-inbox text (≤ IDEA_TEXT_MAX).
 * No name, no e-mail here: the ideas inbox redacts e-mails by design.
 * The seller's contact travels by the register notice (see file header).
 * The description slot carries the APPROVED summary (the raw working
 * description never leaves the device); the desired price is not personal
 * information, so it travels here, explicitly in US dollars. The summary is
 * clipped further when needed so the whole text — price included — always
 * fits IDEA_TEXT_MAX and keeps « Accord: oui » last.
 */
export function ideaSaleInboxText(form: IdeaSaleForm): string {
  const head = [
    IDEA_SALE_TAG,
    `Titre: ${clipField(form.title, IDEA_SALE_TITLE_MAX)}`,
    `Catégorie: ${IDEA_SALE_CATEGORY_LABELS_FR[form.category] ?? IDEA_SALE_CATEGORY_LABELS_FR.autre}`,
  ];
  const price = parseIdeaSalePrice(form.price);
  const pricePart = price === null ? null : `Prix souhaité: ${formatIdeaSalePrice(price)} USD`;
  const tail = "Accord: oui";
  const skeleton = [...head, "", ...(pricePart ? [pricePart] : []), tail].join(" | ");
  const budget = Math.max(0, IDEA_TEXT_MAX - skeleton.length - "Description: ".length);
  const source =
    clipField(form.summary, IDEA_SALE_SUMMARY_MAX) ||
    clipField(form.description, IDEA_SALE_DESCRIPTION_MAX);
  const description = source.slice(0, Math.min(IDEA_SALE_DESCRIPTION_MAX, budget));
  const parts = [...head, `Description: ${description}`, ...(pricePart ? [pricePart] : []), tail];
  return parts.join(" | ").slice(0, IDEA_TEXT_MAX);
}

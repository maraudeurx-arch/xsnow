/**
 * « Mes idées proposées » — the seller's own on-device copy of the ideas
 * they submitted through « Vendre mes idées » (Popol, 07/11/2026: once a
 * person has submitted an idea, they can come back to the section, see
 * their idea nº 1, nº 2, … and submit a new one).
 *
 * Scope, honestly: the proposal itself travels to the team inbox and the
 * seller's contact to the register notice (see idea-sale.ts); the team
 * replies by e-mail. There is no server-side per-seller listing to read
 * back, so this list is the copy kept on the person's own device, written
 * at the moment a submission is confirmed sent. Its status is therefore
 * only « reçue » — no approval state is invented here; approval news
 * arrives by e-mail, exactly as the form's confirmation message says.
 *
 * The copy carries no name and no e-mail: only the title, the category,
 * the approved summary (the very text the team received), the desired
 * price in US dollars when one was given, and the submission date.
 * Nothing new is collected. Storage mirrors the local profile: durable
 * storage under an `xsnow.*` key (localStorage + IndexedDB backup).
 */

import { durableGet, durableSet } from "./durable-storage.ts";
import {
  IDEA_SALE_CATEGORIES,
  IDEA_SALE_PRICE_MAX_USD,
  IDEA_SALE_SUMMARY_MAX,
  IDEA_SALE_TITLE_MAX,
  parseIdeaSalePrice,
  type IdeaSaleCategory,
  type IdeaSaleForm,
} from "./idea-sale.ts";

export const IDEA_SALE_SUBMISSIONS_KEY = "xsnow.ideaSaleSubmissions";

export type IdeaSaleSubmission = {
  id: string;
  title: string;
  category: IdeaSaleCategory;
  /** The approved summary, exactly as sent to the team inbox. */
  summary: string;
  /** Desired price in US dollars, or null when none was given. */
  priceUsd: number | null;
  /** ISO timestamp of the confirmed send. */
  submittedAt: string;
};

/** Same field hygiene as idea-sale.ts: no newlines/tabs/pipes, collapsed spaces. */
function clipText(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/[\r\n\t|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function clipId(value: unknown) {
  return String(value ?? "")
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .slice(0, 80);
}

function parseSubmission(value: unknown): IdeaSaleSubmission | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = clipId(record.id);
  const title = clipText(record.title, IDEA_SALE_TITLE_MAX);
  const summary = clipText(record.summary, IDEA_SALE_SUMMARY_MAX);
  const category = IDEA_SALE_CATEGORIES.includes(record.category as IdeaSaleCategory)
    ? (record.category as IdeaSaleCategory)
    : null;
  const submittedAt = typeof record.submittedAt === "string" ? record.submittedAt : "";
  if (!id || !title || !summary || !category) return null;
  if (!submittedAt || Number.isNaN(Date.parse(submittedAt))) return null;
  const price = record.priceUsd;
  const priceUsd =
    typeof price === "number" && Number.isFinite(price) && price > 0 && price <= IDEA_SALE_PRICE_MAX_USD
      ? price
      : null;
  return { id, title, category, summary, priceUsd, submittedAt };
}

/** Defensive parse of the stored list: anything unusable is dropped, never thrown. */
export function parseIdeaSaleSubmissions(raw: string | null): IdeaSaleSubmission[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => parseSubmission(entry))
      .filter((entry): entry is IdeaSaleSubmission => entry !== null);
  } catch {
    return [];
  }
}

/**
 * Build the on-device copy of a submission from a validated form, at the
 * moment its send is confirmed. The summary stored is the approved one —
 * the text the team received — never the raw working description.
 */
export function submissionFromIdeaSaleForm(
  form: IdeaSaleForm,
  id: string,
  now: Date,
): IdeaSaleSubmission {
  return {
    id: clipId(id),
    title: clipText(form.title, IDEA_SALE_TITLE_MAX),
    category: form.category,
    summary:
      clipText(form.summary, IDEA_SALE_SUMMARY_MAX) ||
      clipText(form.description, IDEA_SALE_SUMMARY_MAX),
    priceUsd: parseIdeaSalePrice(form.price),
    submittedAt: now.toISOString(),
  };
}

/**
 * Append a submission, in submission order, without overwriting the
 * previous ones. A second entry with the same id is ignored, so a
 * double-recorded send can never duplicate or renumber the list.
 */
export function appendIdeaSaleSubmission(
  list: readonly IdeaSaleSubmission[],
  entry: IdeaSaleSubmission,
): IdeaSaleSubmission[] {
  if (list.some((existing) => existing.id === entry.id)) return [...list];
  return [...list, entry];
}

function storageOf(store?: Storage): Storage | undefined {
  if (store) return store;
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readIdeaSaleSubmissions(store?: Storage): IdeaSaleSubmission[] {
  try {
    return parseIdeaSaleSubmissions(durableGet(IDEA_SALE_SUBMISSIONS_KEY, storageOf(store)));
  } catch {
    return [];
  }
}

export function writeIdeaSaleSubmissions(
  list: readonly IdeaSaleSubmission[],
  store?: Storage,
) {
  durableSet(IDEA_SALE_SUBMISSIONS_KEY, JSON.stringify(list), storageOf(store));
}

/** Record a freshly sent submission and return the updated list. */
export function recordIdeaSaleSubmission(
  entry: IdeaSaleSubmission,
  store?: Storage,
): IdeaSaleSubmission[] {
  const next = appendIdeaSaleSubmission(readIdeaSaleSubmissions(store), entry);
  writeIdeaSaleSubmissions(next, store);
  return next;
}

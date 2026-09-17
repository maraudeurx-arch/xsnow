/**
 * Peer-to-peer community offers (MVP = device-local localStorage + optional share URL).
 * Form templates help a visitor write a morning car loan, hotspot, UX session, or skills listing.
 * They are not live listings. Never inject an owner/demo offer into En demande.
 * Community-wide items load from the versioned public catalog after development-team approval.
 * Visitor-authored fields are plain text only (see sanitize.ts).
 */

import {
  CONTACT_TEXT_MAX,
  NOTES_TEXT_MAX,
  SHARE_TEXT_MAX,
  TITLE_TEXT_MAX,
  safeHttpUrl,
  sanitizeRecordId,
  sanitizeUntrustedText,
} from "./sanitize.ts";
import {
  DEFAULT_SKILLS_FROM,
  DEFAULT_SKILLS_PRICE_CAD,
  DEFAULT_SKILLS_TITLE,
  DEFAULT_SKILLS_TO,
  parseAvailabilityDays,
  parseSkillIds,
  sanitizeSkillOther,
  skillFormIssues,
  skillsFallbackTitle,
  skillsNotes,
  type SkillId,
  type Weekday,
} from "./skills.ts";

export const PUBLIC_OFFER_SITE_URL = "https://maraudeurx-arch.github.io/xsnow/";

export const OFFERS_KEY = "xsnow.offers";
export const IMPORTED_OFFERS_KEY = "xsnow.importedOffers";
export const OFFER_REQUESTS_KEY = "xsnow.offerRequests";
export const SHARE_TEXT_KEY_PREFIX = "opc-share-text:";

export const OFFER_KINDS = ["car_morning", "hotspot", "ux_session", "skills"] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

/** Legacy id from the pre-0.3.0 bundled “featured” car listing — never show or re-seed it. */
export const FEATURED_CAR_MORNING_ID = "featured-car-morning";
export const DRAFT_HOTSPOT_ID = "draft-hotspot";
export const DRAFT_UX_SESSION_ID = "draft-ux-session";
export const DEFAULT_CAR_TITLE = "Prêt de voiture le matin";
export const DEFAULT_HOTSPOT_TITLE = "Hotspot / connexion partagée";
export const DEFAULT_UX_TITLE = "Session test utilisateur";
export const DEFAULT_WINDOW_FROM = "05:00";
export const DEFAULT_WINDOW_TO = "12:00";
export const DEFAULT_HOTSPOT_FROM = "08:00";
export const DEFAULT_HOTSPOT_TO = "20:00";
export const DEFAULT_UX_FROM = "09:00";
export const DEFAULT_UX_TO = "18:00";
export const DEFAULT_PRICE_CAD = 35;
export const DEFAULT_HOTSPOT_PRICE_CAD = 8;
export const DEFAULT_UX_PRICE_CAD = 25;

export function isInjectedSeedId(id: string) {
  return id === FEATURED_CAR_MORNING_ID || id.startsWith("seed-");
}
export const DEFAULT_HOTSPOT_NOTES =
  "Hotspot Wi-Fi ou aide de connexion pour un voisin. Tarif à la session. Règles : débit raisonnable, pas d’usage illégal, vérifier ton forfait / FAI. Entente privée.";
export const DEFAULT_UX_NOTES =
  "Session de test utilisateur (app ou site) : 30 à 45 min, retours honnêtes. Pas de faux comptes, pas de ferme de clics. Tarif à la session.";

export type CommunityOffer = {
  id: string;
  kind: OfferKind;
  title: string;
  windowFrom: string;
  windowTo: string;
  earlierOk: boolean;
  priceCad: number;
  gasBorrowerPays: boolean;
  neighborhood: string;
  interacContact: string;
  paypalMe: string;
  insuranceOk: boolean;
  notes: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  skillIds?: SkillId[];
  skillOther?: string;
  availabilityDays?: Weekday[];
};

export type OfferFormInput = {
  kind: OfferKind;
  title: string;
  windowFrom: string;
  windowTo: string;
  priceCad: number | string;
  gasBorrowerPays: boolean;
  neighborhood: string;
  interacContact: string;
  paypalMe: string;
  insuranceOk: boolean;
  notes: string;
  skillIds?: SkillId[];
  skillOther?: string;
  availabilityDays?: Weekday[];
};

export type OfferRequest = {
  id: string;
  offerId: string;
  offerTitle: string;
  name: string;
  contact: string;
  date: string;
  message: string;
  createdAt: string;
};

export type PublishIssue =
  | "title"
  | "interac"
  | "insurance"
  | "gas"
  | "price"
  | "skills"
  | "other"
  | "days"
  | "hours";

export type SharePayload = {
  k: OfferKind;
  t: string;
  f: string;
  u: string;
  p: number;
  n: string;
  i: string;
  y?: string;
  o?: string;
  id?: string;
};

function nextId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s().-]{5,}$/;
const PAYPAL_HANDLE_RE = /^[A-Za-z0-9._-]+$/;

export function isOfferKind(value: unknown): value is OfferKind {
  return (
    value === "car_morning" ||
    value === "hotspot" ||
    value === "ux_session" ||
    value === "skills"
  );
}

export function parseOfferKindQuery(value: string | null | undefined): OfferKind | null {
  if (value === "car-morning" || value === "car_morning") return "car_morning";
  if (value === "hotspot") return "hotspot";
  if (value === "ux-session" || value === "ux_session") return "ux_session";
  if (value === "skills") return "skills";
  return null;
}

export function offerKindQuery(kind: OfferKind) {
  if (kind === "hotspot") return "hotspot";
  if (kind === "ux_session") return "ux-session";
  if (kind === "skills") return "skills";
  return "car-morning";
}

export function parseOfferTemplateQuery(value: string | null | undefined): OfferKind | null {
  if (value === "hotspot") return "hotspot";
  if (value === "ux" || value === "ux-session" || value === "ux_session") return "ux_session";
  if (value === "car-morning" || value === "car_morning") return "car_morning";
  if (value === "skills") return "skills";
  return null;
}

export function draftTemplateId(kind: OfferKind) {
  if (kind === "hotspot") return DRAFT_HOTSPOT_ID;
  if (kind === "ux_session") return DRAFT_UX_SESSION_ID;
  return "";
}

export function looksLikeEmail(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^(javascript|data|vbscript|file|blob):/i.test(trimmed)) return false;
  return EMAIL_RE.test(trimmed);
}

export function looksLikePhone(value: string) {
  const compact = value.trim();
  if (looksLikeEmail(compact)) return false;
  return PHONE_RE.test(compact);
}

export function normalizePaypalMe(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const stripped = trimmed
    .replace(/^https?:\/\/(www\.)?paypal\.me\//i, "")
    .replace(/^paypal\.me\//i, "")
    .replace(/^\//, "")
    .split(/[?#]/)[0]
    .trim()
    .slice(0, 80);
  if (!stripped || !PAYPAL_HANDLE_RE.test(stripped)) return "";
  return stripped;
}

export function paypalMeUrl(value: string) {
  const handle = normalizePaypalMe(value);
  if (!handle) return "";
  return safeHttpUrl(`https://www.paypal.me/${encodeURIComponent(handle)}`);
}

export function mailtoHref(email: string, subject: string, body: string) {
  const clean = String(email || "").trim();
  if (!looksLikeEmail(clean)) return "";
  const safeSubject = sanitizeUntrustedText(subject, { max: 200, redactEmails: false });
  const safeBody = sanitizeUntrustedText(body, {
    max: 1500,
    redactEmails: false,
    allowNewlines: true,
  });
  return `mailto:${encodeURIComponent(clean)}?subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}`;
}

export function smsHref(phone: string, body: string) {
  if (!looksLikePhone(phone)) return "";
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return "";
  const safeBody = sanitizeUntrustedText(body, {
    max: 1500,
    redactEmails: false,
    allowNewlines: true,
  });
  return `sms:${digits}?&body=${encodeURIComponent(safeBody)}`;
}

export function carMorningDefaults(): OfferFormInput {
  return {
    kind: "car_morning",
    title: DEFAULT_CAR_TITLE,
    windowFrom: DEFAULT_WINDOW_FROM,
    windowTo: DEFAULT_WINDOW_TO,
    priceCad: DEFAULT_PRICE_CAD,
    gasBorrowerPays: true,
    neighborhood: "",
    interacContact: "",
    paypalMe: "",
    insuranceOk: false,
    notes: "",
    skillIds: [],
    skillOther: "",
    availabilityDays: [],
  };
}

export function hotspotDefaults(): OfferFormInput {
  return {
    kind: "hotspot",
    title: DEFAULT_HOTSPOT_TITLE,
    windowFrom: DEFAULT_HOTSPOT_FROM,
    windowTo: DEFAULT_HOTSPOT_TO,
    priceCad: DEFAULT_HOTSPOT_PRICE_CAD,
    gasBorrowerPays: false,
    neighborhood: "",
    interacContact: "",
    paypalMe: "",
    insuranceOk: false,
    notes: DEFAULT_HOTSPOT_NOTES,
    skillIds: [],
    skillOther: "",
    availabilityDays: [],
  };
}

export function uxSessionDefaults(): OfferFormInput {
  return {
    kind: "ux_session",
    title: DEFAULT_UX_TITLE,
    windowFrom: DEFAULT_UX_FROM,
    windowTo: DEFAULT_UX_TO,
    priceCad: DEFAULT_UX_PRICE_CAD,
    gasBorrowerPays: false,
    neighborhood: "",
    interacContact: "",
    paypalMe: "",
    insuranceOk: false,
    notes: DEFAULT_UX_NOTES,
    skillIds: [],
    skillOther: "",
    availabilityDays: [],
  };
}

export function skillsDefaults(): OfferFormInput {
  return {
    kind: "skills",
    title: DEFAULT_SKILLS_TITLE,
    windowFrom: DEFAULT_SKILLS_FROM,
    windowTo: DEFAULT_SKILLS_TO,
    priceCad: DEFAULT_SKILLS_PRICE_CAD,
    gasBorrowerPays: false,
    neighborhood: "",
    interacContact: "",
    paypalMe: "",
    insuranceOk: false,
    notes: "",
    skillIds: [],
    skillOther: "",
    availabilityDays: [],
  };
}

export function defaultsForKind(kind: OfferKind): OfferFormInput {
  if (kind === "hotspot") return hotspotDefaults();
  if (kind === "ux_session") return uxSessionDefaults();
  if (kind === "skills") return skillsDefaults();
  return carMorningDefaults();
}

export function formFromOffer(offer: CommunityOffer): OfferFormInput {
  return {
    kind: offer.kind,
    title: offer.title,
    windowFrom: offer.windowFrom,
    windowTo: offer.windowTo,
    priceCad: offer.priceCad,
    gasBorrowerPays: offer.gasBorrowerPays,
    neighborhood: offer.neighborhood,
    interacContact: offer.interacContact,
    paypalMe: offer.paypalMe,
    insuranceOk: offer.insuranceOk,
    notes: offer.notes,
    skillIds: parseSkillIds(offer.skillIds),
    skillOther: offer.skillOther || "",
    availabilityDays: parseAvailabilityDays(offer.availabilityDays),
  };
}

export function parsePriceCad(value: number | string) {
  const amount = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

export function formKind(input: Pick<OfferFormInput, "kind"> | OfferKind): OfferKind {
  if (typeof input === "string") return isOfferKind(input) ? input : "car_morning";
  return isOfferKind(input.kind) ? input.kind : "car_morning";
}

export function publishIssues(input: OfferFormInput): PublishIssue[] {
  const kind = formKind(input);
  if (kind === "skills") {
    return skillFormIssues(input) as PublishIssue[];
  }
  const issues: PublishIssue[] = [];
  if (!String(input.title || "").trim()) issues.push("title");
  if (!String(input.interacContact || "").trim()) issues.push("interac");
  if (parsePriceCad(input.priceCad) == null) issues.push("price");
  if (kind === "car_morning") {
    if (!input.insuranceOk) issues.push("insurance");
    if (!input.gasBorrowerPays) issues.push("gas");
  }
  return issues;
}

export function canPublish(input: OfferFormInput) {
  return publishIssues(input).length === 0;
}

export function fallbackTitle(kind: OfferKind) {
  if (kind === "hotspot") return DEFAULT_HOTSPOT_TITLE;
  if (kind === "ux_session") return DEFAULT_UX_TITLE;
  if (kind === "skills") return DEFAULT_SKILLS_TITLE;
  return DEFAULT_CAR_TITLE;
}

export function offerFromForm(
  input: OfferFormInput,
  existing?: CommunityOffer,
  now = new Date().toISOString(),
): CommunityOffer {
  const kind = formKind(input);
  const defaults = defaultsForKind(kind);
  const skillIds = kind === "skills" ? parseSkillIds(input.skillIds) : [];
  const skillOther = kind === "skills" ? sanitizeSkillOther(input.skillOther) : "";
  const availabilityDays = kind === "skills" ? parseAvailabilityDays(input.availabilityDays) : [];
  const price =
    kind === "skills"
      ? DEFAULT_SKILLS_PRICE_CAD
      : (parsePriceCad(input.priceCad) ?? defaults.priceCad);
  const title =
    kind === "skills"
      ? sanitizeUntrustedText(String(input.title || ""), {
          max: TITLE_TEXT_MAX,
          redactEmails: true,
        }) || skillsFallbackTitle(skillIds, skillOther)
      : sanitizeUntrustedText(String(input.title || ""), {
          max: TITLE_TEXT_MAX,
          redactEmails: false,
        }) || fallbackTitle(kind);
  const notes =
    kind === "skills"
      ? skillsNotes(availabilityDays, skillOther)
      : sanitizeUntrustedText(String(input.notes || ""), {
          max: NOTES_TEXT_MAX,
          redactEmails: false,
          allowNewlines: true,
        });
  return {
    id: sanitizeRecordId(existing?.id) || nextId(),
    kind,
    title,
    windowFrom: String(input.windowFrom || defaults.windowFrom).slice(0, 5),
    windowTo: String(input.windowTo || defaults.windowTo).slice(0, 5),
    earlierOk: true,
    priceCad: typeof price === "number" ? price : DEFAULT_PRICE_CAD,
    gasBorrowerPays: kind === "car_morning" ? Boolean(input.gasBorrowerPays) : false,
    neighborhood: sanitizeUntrustedText(String(input.neighborhood || ""), {
      max: 80,
      redactEmails: true,
    }),
    interacContact:
      kind === "skills"
        ? ""
        : sanitizeUntrustedText(String(input.interacContact || ""), {
            max: CONTACT_TEXT_MAX,
            redactEmails: false,
          }),
    paypalMe: kind === "skills" ? "" : normalizePaypalMe(input.paypalMe || ""),
    insuranceOk: kind === "car_morning" ? Boolean(input.insuranceOk) : false,
    notes,
    published: canPublish(input),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...(kind === "skills" ? { skillIds, skillOther, availabilityDays } : {}),
  };
}

/** Unpublished helper kept in the same localStorage list — never shown in En demande. */
export function unpublishedTemplateOffer(
  kind: "hotspot" | "ux_session",
  input?: Partial<OfferFormInput>,
  existing?: CommunityOffer,
  now = new Date().toISOString(),
): CommunityOffer {
  const base = defaultsForKind(kind);
  const form: OfferFormInput = { ...base, ...input, kind };
  const offer = offerFromForm(form, existing, now);
  return {
    ...offer,
    id: sanitizeRecordId(existing?.id) || draftTemplateId(kind),
    published: false,
  };
}

export function formatHourFr(hhmm: string) {
  const [h = "0", m = "00"] = hhmm.split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return hhmm;
  return m === "00" ? `${hour} h` : `${hour} h ${m}`;
}

export function formatCad(amount: number, locale = "fr") {
  const tag = locale === "fr" ? "fr-CA" : locale === "es" ? "es-CA" : "en-CA";
  try {
    return new Intl.NumberFormat(tag, {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} CAD`;
  }
}

function clipShare(value: string, max: number) {
  return sanitizeUntrustedText(value, { max, redactEmails: false, allowNewlines: false });
}

export function toSharePayload(offer: CommunityOffer): SharePayload {
  const payload: SharePayload = {
    k: offer.kind,
    t: clipShare(offer.title, 80),
    f: offer.windowFrom,
    u: offer.windowTo,
    p: offer.priceCad,
    n: clipShare(offer.neighborhood, 40),
    i: clipShare(offer.interacContact, 80),
    id: offer.id === FEATURED_CAR_MORNING_ID ? undefined : offer.id,
  };
  if (offer.paypalMe) payload.y = clipShare(offer.paypalMe, 40);
  if (offer.notes) payload.o = clipShare(offer.notes, 80);
  return payload;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeSharePayload(payload: SharePayload) {
  const json = JSON.stringify(payload);
  // Prefer btoa: browser Buffer polyfills often lack "base64url".
  if (typeof btoa === "function") {
    return bytesToBase64Url(new TextEncoder().encode(json));
  }
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeSharePayload(raw: string): SharePayload | null {
  if (typeof raw !== "string" || raw.length > 4096) return null;
  try {
    const json =
      typeof atob === "function"
        ? new TextDecoder().decode(base64UrlToBytes(raw))
        : Buffer.from(raw, "base64url").toString("utf8");
    if (json.length > 4096) return null;
    const parsed = JSON.parse(json) as SharePayload;
    if (!isOfferKind(parsed.k)) return null;
    if (typeof parsed.t !== "string" || typeof parsed.f !== "string" || typeof parsed.u !== "string") {
      return null;
    }
    if (typeof parsed.p !== "number" || !Number.isFinite(parsed.p)) return null;
    if (typeof parsed.n !== "string" || typeof parsed.i !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function offerFromSharePayload(payload: SharePayload, now = new Date().toISOString()): CommunityOffer {
  const sharedId = sanitizeRecordId(payload.id);
  return {
    id: sharedId && sharedId !== FEATURED_CAR_MORNING_ID ? sharedId : "shared-car-morning",
    kind: payload.k,
    title:
      sanitizeUntrustedText(payload.t || DEFAULT_CAR_TITLE, {
        max: TITLE_TEXT_MAX,
        redactEmails: false,
      }) || DEFAULT_CAR_TITLE,
    windowFrom: String(payload.f || DEFAULT_WINDOW_FROM).slice(0, 5),
    windowTo: String(payload.u || DEFAULT_WINDOW_TO).slice(0, 5),
    earlierOk: true,
    priceCad: payload.p,
    gasBorrowerPays: true,
    neighborhood: sanitizeUntrustedText(payload.n || "", {
      max: 40,
      redactEmails: true,
    }),
    interacContact: sanitizeUntrustedText(payload.i, {
      max: CONTACT_TEXT_MAX,
      redactEmails: false,
    }),
    paypalMe: payload.y ? normalizePaypalMe(payload.y) : "",
    insuranceOk: true,
    notes: sanitizeUntrustedText(payload.o || "", {
      max: 80,
      redactEmails: false,
      allowNewlines: false,
    }),
    published: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function demandPath(payload?: SharePayload) {
  const base = `${PUBLIC_OFFER_SITE_URL.replace(/\/+$/, "")}/en-demande/`;
  const kind = payload?.k && isOfferKind(payload.k) ? payload.k : "car_morning";
  const query = offerKindQuery(kind);
  if (!payload) return `${base}?kind=${query}`;
  return `${base}?kind=${query}&o=${encodeSharePayload(payload)}`;
}

/** Always French — Marketplace / group posts for the Gatineau launch. */
export function sharePostFr(offer: CommunityOffer) {
  const area = offer.neighborhood.trim();
  const price = formatCad(offer.priceCad, "fr");
  const windowLine = `Disponible de ${formatHourFr(offer.windowFrom)} à ${formatHourFr(offer.windowTo)} (ou plus tôt).`;
  const priceLine =
    offer.kind === "car_morning"
      ? `${price} par matin. L’essence est à la charge de l’emprunteur.`
      : offer.kind === "skills"
        ? "Compétences de quartier. Entente privée."
        : `${price} par session.`;
  const payLine = offer.interacContact
    ? offer.kind === "car_morning"
      ? `Paiement : Interac e-Transfer à ${offer.interacContact} (l’essence en plus).`
      : `Paiement : Interac e-Transfer à ${offer.interacContact}.`
    : offer.kind === "car_morning"
      ? "Paiement : Interac e-Transfer (l’essence en plus). Le prestataire confirme le contact."
      : offer.kind === "skills"
        ? "Contact via En demande. Open Community n’est pas l’employeur."
        : "Paiement : Interac e-Transfer. Le prestataire confirme le contact.";
  const lines = [area ? `${offer.title} — ${area}` : offer.title, "", windowLine, priceLine];
  if (offer.notes) lines.push(offer.notes);
  lines.push("", `Réserver ici :`, demandPath(toSharePayload(offer)), "", payLine);
  if (offer.paypalMe) lines.push(`PayPal : ${paypalMeUrl(offer.paypalMe)}`);
  lines.push(
    "",
    "Entente privée entre voisins. Open Community (OPC) est un babillard — pas l’assureur ni le processeur de paiement.",
    PUBLIC_OFFER_SITE_URL,
  );
  return lines.join("\n");
}

export function mergeBrowseOffers(
  owned: CommunityOffer[],
  imported: CommunityOffer[],
  fromUrl: CommunityOffer | null,
  catalog: CommunityOffer[] = [],
) {
  const byId = new Map<string, CommunityOffer>();
  const take = (offer: CommunityOffer | null | undefined) => {
    if (!offer?.published || isInjectedSeedId(offer.id) || byId.has(offer.id)) return;
    byId.set(offer.id, offer);
  };
  for (const offer of owned) take(offer);
  for (const offer of imported) take(offer);
  take(fromUrl);
  for (const offer of catalog) take(offer);
  return [...byId.values()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function parseStoredOffer(raw: unknown): CommunityOffer | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!isOfferKind(record.kind)) return null;
  const title = sanitizeUntrustedText(typeof record.title === "string" ? record.title : "", {
    max: TITLE_TEXT_MAX,
    redactEmails: false,
  });
  if (!title) return null;
  const id = sanitizeRecordId(record.id);
  if (!id) return null;
  const price =
    typeof record.priceCad === "number" && Number.isFinite(record.priceCad)
      ? record.priceCad
      : parsePriceCad(String(record.priceCad ?? ""));
  if (price == null && record.kind !== "skills") return null;
  const createdAt =
    typeof record.createdAt === "string" && record.createdAt ? record.createdAt : new Date().toISOString();
  return {
    id,
    kind: record.kind,
    title,
    windowFrom: String(record.windowFrom || "").slice(0, 5),
    windowTo: String(record.windowTo || "").slice(0, 5),
    earlierOk: true,
    priceCad: price ?? 0,
    gasBorrowerPays: Boolean(record.gasBorrowerPays),
    neighborhood: sanitizeUntrustedText(typeof record.neighborhood === "string" ? record.neighborhood : "", {
      max: 80,
      redactEmails: true,
    }),
    interacContact: sanitizeUntrustedText(typeof record.interacContact === "string" ? record.interacContact : "", {
      max: CONTACT_TEXT_MAX,
      redactEmails: false,
    }),
    paypalMe: typeof record.paypalMe === "string" ? normalizePaypalMe(record.paypalMe) : "",
    insuranceOk: Boolean(record.insuranceOk),
    notes: sanitizeUntrustedText(typeof record.notes === "string" ? record.notes : "", {
      max: NOTES_TEXT_MAX,
      redactEmails: false,
      allowNewlines: true,
    }),
    published: record.published === true,
    createdAt,
    updatedAt: typeof record.updatedAt === "string" && record.updatedAt ? record.updatedAt : createdAt,
    ...(record.kind === "skills"
      ? {
          skillIds: parseSkillIds(record.skillIds),
          skillOther: sanitizeSkillOther(record.skillOther),
          availabilityDays: parseAvailabilityDays(record.availabilityDays),
        }
      : {}),
  };
}

export function parseStoredRequest(raw: unknown): OfferRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const name = sanitizeUntrustedText(typeof record.name === "string" ? record.name : "", {
    max: 80,
    redactEmails: false,
  });
  const contact = sanitizeUntrustedText(typeof record.contact === "string" ? record.contact : "", {
    max: CONTACT_TEXT_MAX,
    redactEmails: false,
  });
  if (!name || !contact) return null;
  const id = sanitizeRecordId(record.id);
  const offerId = sanitizeRecordId(record.offerId);
  if (!id || !offerId) return null;
  return {
    id,
    offerId,
    offerTitle: sanitizeUntrustedText(typeof record.offerTitle === "string" ? record.offerTitle : "", {
      max: TITLE_TEXT_MAX,
      redactEmails: false,
    }),
    name,
    contact,
    date: sanitizeUntrustedText(typeof record.date === "string" ? record.date : "", {
      max: 16,
      redactEmails: false,
    }),
    message: sanitizeUntrustedText(typeof record.message === "string" ? record.message : "", {
      max: 500,
      redactEmails: false,
      allowNewlines: true,
    }),
    createdAt: typeof record.createdAt === "string" && record.createdAt ? record.createdAt : new Date().toISOString(),
  };
}

export function clipShareText(text: string) {
  return sanitizeUntrustedText(text, {
    max: SHARE_TEXT_MAX,
    redactEmails: false,
    allowNewlines: true,
  });
}

export function shareTextKey(offerId: string) {
  return `${SHARE_TEXT_KEY_PREFIX}${offerId}`;
}

export function readEditedShareText(offerId: string) {
  if (typeof window === "undefined" || !offerId) return "";
  try {
    return clipShareText(window.localStorage.getItem(shareTextKey(offerId)) || "");
  } catch {
    return "";
  }
}

export function writeEditedShareText(offerId: string, text: string) {
  if (typeof window === "undefined" || !offerId) return;
  try {
    const clean = clipShareText(text);
    if (!clean) {
      window.localStorage.removeItem(shareTextKey(offerId));
      return;
    }
    window.localStorage.setItem(shareTextKey(offerId), clean);
  } catch {
    // Private mode / quota
  }
}

export function draftShareText(offer: CommunityOffer) {
  const saved = readEditedShareText(offer.id);
  if (saved.trim()) return saved;
  try {
    return sharePostFr(offer);
  } catch {
    return `${offer.title}\n${PUBLIC_OFFER_SITE_URL}`;
  }
}

export async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to execCommand
    }
  }
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

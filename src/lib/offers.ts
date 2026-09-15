/**
 * Peer-to-peer community offers (MVP = localStorage + optional share URL).
 * First real offer: morning car loan, Interac e-Transfer, borrower pays gas.
 */

export const PUBLIC_OFFER_SITE_URL = "https://maraudeurx-arch.github.io/xsnow/";

export const OFFERS_KEY = "xsnow.offers";
export const IMPORTED_OFFERS_KEY = "xsnow.importedOffers";
export const OFFER_REQUESTS_KEY = "xsnow.offerRequests";
export const SHARE_TEXT_KEY_PREFIX = "opc-share-text:";

export const OFFER_KINDS = ["car_morning"] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

export const FEATURED_CAR_MORNING_ID = "featured-car-morning";
export const DEFAULT_CAR_TITLE = "Prêt de voiture le matin";
export const DEFAULT_WINDOW_FROM = "05:00";
export const DEFAULT_WINDOW_TO = "12:00";
export const DEFAULT_PRICE_CAD = 35;
export const DEFAULT_NEIGHBORHOOD = "Gatineau";

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
};

export type OfferFormInput = {
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
  | "price";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s().-]{5,}$/;

export function isOfferKind(value: unknown): value is OfferKind {
  return value === "car_morning";
}

export function looksLikeEmail(value: string) {
  return EMAIL_RE.test(value.trim());
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
    .trim();
  return stripped.slice(0, 80);
}

export function paypalMeUrl(value: string) {
  const handle = normalizePaypalMe(value);
  if (!handle) return "";
  return `https://www.paypal.me/${encodeURIComponent(handle)}`;
}

export function mailtoHref(email: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function smsHref(phone: string, body: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return "";
  return `sms:${digits}?&body=${encodeURIComponent(body)}`;
}

export function carMorningDefaults(): OfferFormInput {
  return {
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
  };
}

export function featuredCarMorningOffer(now = new Date().toISOString()): CommunityOffer {
  return {
    id: FEATURED_CAR_MORNING_ID,
    kind: "car_morning",
    title: DEFAULT_CAR_TITLE,
    windowFrom: DEFAULT_WINDOW_FROM,
    windowTo: DEFAULT_WINDOW_TO,
    earlierOk: true,
    priceCad: DEFAULT_PRICE_CAD,
    gasBorrowerPays: true,
    neighborhood: DEFAULT_NEIGHBORHOOD,
    interacContact: "",
    paypalMe: "",
    insuranceOk: true,
    notes: "",
    published: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function formFromOffer(offer: CommunityOffer): OfferFormInput {
  return {
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
  };
}

export function parsePriceCad(value: number | string) {
  const amount = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

export function publishIssues(input: OfferFormInput): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!String(input.title || "").trim()) issues.push("title");
  if (!String(input.interacContact || "").trim()) issues.push("interac");
  if (!input.insuranceOk) issues.push("insurance");
  if (!input.gasBorrowerPays) issues.push("gas");
  if (parsePriceCad(input.priceCad) == null) issues.push("price");
  return issues;
}

export function canPublish(input: OfferFormInput) {
  return publishIssues(input).length === 0;
}

export function offerFromForm(
  input: OfferFormInput,
  existing?: CommunityOffer,
  now = new Date().toISOString(),
): CommunityOffer {
  const price = parsePriceCad(input.priceCad) ?? DEFAULT_PRICE_CAD;
  return {
    id: existing?.id ?? nextId(),
    kind: "car_morning",
    title: String(input.title || "").trim() || DEFAULT_CAR_TITLE,
    windowFrom: String(input.windowFrom || DEFAULT_WINDOW_FROM).slice(0, 5),
    windowTo: String(input.windowTo || DEFAULT_WINDOW_TO).slice(0, 5),
    earlierOk: true,
    priceCad: price,
    gasBorrowerPays: Boolean(input.gasBorrowerPays),
    neighborhood: String(input.neighborhood || "").trim(),
    interacContact: String(input.interacContact || "").trim(),
    paypalMe: normalizePaypalMe(input.paypalMe || ""),
    insuranceOk: Boolean(input.insuranceOk),
    notes: String(input.notes || "").trim().slice(0, 800),
    published: canPublish(input),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
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
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function toSharePayload(offer: CommunityOffer): SharePayload {
  const payload: SharePayload = {
    k: offer.kind,
    t: clipShare(offer.title, 80),
    f: offer.windowFrom,
    u: offer.windowTo,
    p: offer.priceCad,
    n: clipShare(offer.neighborhood || DEFAULT_NEIGHBORHOOD, 40),
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
  try {
    const json =
      typeof atob === "function"
        ? new TextDecoder().decode(base64UrlToBytes(raw))
        : Buffer.from(raw, "base64url").toString("utf8");
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
  return {
    id: payload.id && payload.id !== FEATURED_CAR_MORNING_ID ? payload.id : `shared-car-morning`,
    kind: payload.k,
    title: payload.t || DEFAULT_CAR_TITLE,
    windowFrom: payload.f || DEFAULT_WINDOW_FROM,
    windowTo: payload.u || DEFAULT_WINDOW_TO,
    earlierOk: true,
    priceCad: payload.p,
    gasBorrowerPays: true,
    neighborhood: payload.n || DEFAULT_NEIGHBORHOOD,
    interacContact: payload.i,
    paypalMe: payload.y ? normalizePaypalMe(payload.y) : "",
    insuranceOk: true,
    notes: payload.o || "",
    published: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function demandPath(payload?: SharePayload) {
  const base = `${PUBLIC_OFFER_SITE_URL.replace(/\/+$/, "")}/en-demande/`;
  if (!payload) return `${base}?kind=car-morning`;
  return `${base}?kind=car-morning&o=${encodeSharePayload(payload)}`;
}

/** Always French — Marketplace / group posts for the Gatineau launch. */
export function sharePostFr(offer: CommunityOffer) {
  const area = offer.neighborhood.trim() || DEFAULT_NEIGHBORHOOD;
  const price = formatCad(offer.priceCad, "fr");
  const lines = [
    `${offer.title} — ${area}`,
    "",
    `Disponible de ${formatHourFr(offer.windowFrom)} à ${formatHourFr(offer.windowTo)} (ou plus tôt).`,
    `${price} par matin. L’essence est à la charge de l’emprunteur.`,
  ];
  if (offer.notes) lines.push(offer.notes);
  lines.push("", `Réserver ici :`, demandPath(toSharePayload(offer)), "");
  if (offer.interacContact) {
    lines.push(`Paiement : Interac e-Transfer à ${offer.interacContact} (l’essence en plus).`);
  } else {
    lines.push("Paiement : Interac e-Transfer (l’essence en plus). Le prestataire confirme le contact.");
  }
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
) {
  const byId = new Map<string, CommunityOffer>();
  for (const offer of owned.filter((item) => item.published)) byId.set(offer.id, offer);
  for (const offer of imported.filter((item) => item.published)) {
    if (!byId.has(offer.id)) byId.set(offer.id, offer);
  }
  if (fromUrl && !byId.has(fromUrl.id)) byId.set(fromUrl.id, fromUrl);
  const list = [...byId.values()];
  if (!list.some((item) => item.kind === "car_morning")) {
    list.unshift(featuredCarMorningOffer());
  }
  return list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function shareTextKey(offerId: string) {
  return `${SHARE_TEXT_KEY_PREFIX}${offerId}`;
}

export function readEditedShareText(offerId: string) {
  if (typeof window === "undefined" || !offerId) return "";
  try {
    return window.localStorage.getItem(shareTextKey(offerId)) || "";
  } catch {
    return "";
  }
}

export function writeEditedShareText(offerId: string, text: string) {
  if (typeof window === "undefined" || !offerId) return;
  try {
    window.localStorage.setItem(shareTextKey(offerId), text);
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

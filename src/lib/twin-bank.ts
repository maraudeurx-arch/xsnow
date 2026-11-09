/**
 * Banque d'images et de voix des jumeaux numériques (OPC → Jumeau).
 * Shared by the OPC client (src/), the twin bank browser and the
 * xsnow-chat Worker (workers/xsnow-chat/src/persona-bank.ts).
 *
 * PRICING = WORKING BASE adopted 09/11/2026: Indiana's proposal (3 $ CA per
 * item per month, 60/30/10, lender paid after 30 days), backed by Popol as his
 * orientation (Yves, mails 1a1c154b + 1a1c1552). The final price is set by
 * Indiana; it replaces the 5 $ model of 03/11. Until a real payment step
 * exists AND Popol gives his written OK to open billing, every use is
 * recorded in TEST MODE only: nothing is ever charged.
 */

/** Live billing is OFF. Flipping it requires Popol's written OK + a real payment step. */
export const TWIN_BANK_LIVE_BILLING = false as const;

/** Supplement per borrowed voice or image, per calendar month, before taxes (cents CAD). */
export const TWIN_BANK_PRICE_CAD_CENTS = 300;

/** Split of each supplement (working base adopted 09/11, sums to 1). Supersedes the 70/30 of the twin spec § 7.8. */
export const TWIN_BANK_SPLIT = { lender: 0.6, opc: 0.3, platform: 0.1 } as const;

/** Lender payouts are released only after the subscriber refund window (days). */
export const TWIN_BANK_PAYOUT_HOLD_DAYS = 30;

/** Version of the lender consent text (Indiana, FR/EN/ES). Bump on any change. */
export const TWIN_BANK_CONSENT_VERSION = "indiana-v1-2026-11-09";

/** Contact for withdrawal / deletion questions, shown in the consent text. */
export const TWIN_BANK_CONTACT_EMAIL = "opencommunity.opc@gmail.com";

export const TWIN_BANK_KINDS = ["voice", "image"] as const;
export type TwinBankKind = (typeof TWIN_BANK_KINDS)[number];

export function isTwinBankKind(value: unknown): value is TwinBankKind {
  return value === "voice" || value === "image";
}

export type TwinBankSplitCents = { lender: number; opc: number; platform: number; total: number };

/** Integer-cent split; rounding remainder goes to platform so the parts always sum to total. */
export function twinBankSplit(totalCents: number): TwinBankSplitCents {
  const total = Math.max(0, Math.round(totalCents));
  const lender = Math.floor(total * TWIN_BANK_SPLIT.lender);
  const opc = Math.floor(total * TWIN_BANK_SPLIT.opc);
  return { lender, opc, platform: total - lender - opc, total };
}

/** Calendar month key in UTC, e.g. "2026-11". One charge per subscriber × item × kind × month. */
export function twinBankMonth(now: number): string {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Date after which a lender share of this month may be paid out. */
export function twinBankPayoutAfter(month: string): number {
  const [y, m] = month.split("-").map(Number);
  const monthEnd = Date.UTC(y, m, 1); // first day of next month
  return monthEnd + TWIN_BANK_PAYOUT_HOLD_DAYS * 86_400_000;
}

export function formatCad(cents: number, locale: "fr" | "en" | "es" = "fr"): string {
  const value = (cents / 100).toFixed(2);
  if (locale === "en") return `CA$${value}`;
  return `${value.replace(".", ",")} $ CA`;
}

/* ---------------- validation shared by client and Worker ---------------- */

export function cleanPseudonym(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const text = raw
    .normalize("NFC")
    .replace(/[<>"'`\\]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length >= 2 && text.length <= 40 ? text : "";
}

export function cleanCountry(raw: unknown): string {
  const text = cleanPseudonym(raw);
  return text.length <= 40 ? text : "";
}

export function isLivenessCode(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]{6}$/.test(value);
}

/** 6-digit code the lender says aloud in the selfie video (self-only / liveness check by the team). */
export function newLivenessCode(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i += 1) out += String(Math.floor(random() * 10) % 10);
  return out;
}

export function isPersonaId(value: unknown): value is string {
  return typeof value === "string" && /^persona-[a-z0-9]{1,16}-[a-z0-9]{1,8}$/.test(value);
}

/** Opaque twin test subscriber id (on-device, test mode). */
export function isSubscriberId(value: unknown): value is string {
  return typeof value === "string" && /^sub-[a-z0-9]{8,40}$/.test(value);
}

/** Media ceilings (also enforced by the Worker). Total stays under the Workers 100 MB body limit. */
export const TWIN_BANK_MAX_BYTES = {
  voice: 10_000_000,
  image: 10_000_000,
  video: 40_000_000,
  selfie: 40_000_000,
} as const;
export const TWIN_BANK_MAX_TOTAL_BYTES = 95_000_000;

/** Which media a deposit must carry for its offer. The selfie video (code said aloud) is always required. */
export function requiredMediaFor(offer: { voice: boolean; image: boolean }): Array<"voice" | "image" | "video" | "selfie"> {
  const out: Array<"voice" | "image" | "video" | "selfie"> = [];
  if (offer.voice) out.push("voice");
  if (offer.image) out.push("image", "video");
  out.push("selfie");
  return out;
}

/**
 * Device-local registration profile (soft-launch privacy).
 *
 * First name, last name, email, and phone stay in localStorage on this
 * device. There is no remote profile API in this MVP — do not POST these
 * fields. No password. The member number is a stable on-device ID, not an
 * account on a server.
 *
 * Member number format: `OPC-` + 4 characters from
 * `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (Crockford-like: no I, O, 0, 1).
 * Example: `OPC-7K3M`. Generated once with `crypto.getRandomValues`.
 * Header display: initials (`P.E.`) next to the logo. Never
 * email or phone in the chrome.
 */

import { durableGet, durableSet } from "./durable-storage.ts";
import { CONTACT_TEXT_MAX, sanitizeUntrustedText } from "./sanitize.ts";

export const LOCAL_PROFILE_KEY = "xsnow.localProfile";

/** Crockford-like alphabet (no I/O/0/1) for a human-friendly OPC number. */
export const OPC_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const OPC_ID_PREFIX = "OPC-";
export const OPC_ID_LENGTH = 4;
export const OPC_ID_RE = /^OPC-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

export const NAME_TEXT_MAX = 40;
export const PHONE_TEXT_MAX = 24;
export const EMAIL_TEXT_MAX = CONTACT_TEXT_MAX;

/** First names at or under this length show as-is next to the logo. */
export const HEADER_FIRST_NAME_MAX = 10;

export type LocalProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalProfileInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type LocalProfileIssue = "firstName" | "lastName" | "email" | "phone";

const EMAIL_OK_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const PHONE_KEEP_RE = /[^\d+().\s-]/g;

export function isOpcMemberId(value: unknown): value is string {
  return typeof value === "string" && OPC_ID_RE.test(value);
}

function randomIndex(max: number, byte: number) {
  return byte % max;
}

/**
 * Collision-resistant on a single device: 32^4 (~1.05e6) codes from CSPRNG.
 * Pass `used` in tests to force a retry; production has one profile per device.
 */
export function generateOpcMemberId(
  createBytes: () => Uint8Array = defaultRandomBytes,
  used: ReadonlySet<string> = new Set(),
  maxAttempts = 8,
): string {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const bytes = createBytes();
    let suffix = "";
    for (let i = 0; i < OPC_ID_LENGTH; i += 1) {
      const n = bytes[i] ?? Math.floor(Math.random() * OPC_ID_ALPHABET.length);
      suffix += OPC_ID_ALPHABET[randomIndex(OPC_ID_ALPHABET.length, n)]!;
    }
    const id = `${OPC_ID_PREFIX}${suffix}`;
    if (isOpcMemberId(id) && !used.has(id)) return id;
  }
  throw new Error("Could not allocate a unique OPC member id");
}

function defaultRandomBytes() {
  const bytes = new Uint8Array(OPC_ID_LENGTH);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

export function sanitizePersonName(raw: unknown): string {
  const text = sanitizeUntrustedText(raw, {
    max: NAME_TEXT_MAX,
    redactEmails: false,
    allowNewlines: false,
  });
  if (!text || looksLikeEmail(text) || looksLikePhone(text)) return "";
  return text;
}

export function sanitizeProfileEmail(raw: unknown): string {
  const text = sanitizeUntrustedText(raw, {
    max: EMAIL_TEXT_MAX,
    redactEmails: false,
    allowNewlines: false,
  })
    .toLowerCase()
    .replace(/\s+/g, "");
  if (!text || !EMAIL_OK_RE.test(text)) return "";
  return text.slice(0, EMAIL_TEXT_MAX);
}

export function sanitizeProfilePhone(raw: unknown): string {
  const text = sanitizeUntrustedText(raw, {
    max: PHONE_TEXT_MAX,
    redactEmails: true,
    allowNewlines: false,
  });
  const folded = text.replace(PHONE_KEEP_RE, "").replace(/\s+/g, " ").trim();
  const digits = folded.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "";
  return folded.slice(0, PHONE_TEXT_MAX);
}

function looksLikeEmail(value: string) {
  return value.includes("@") || EMAIL_OK_RE.test(value);
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && /^[\d\s+().-]+$/.test(value.trim());
}

function firstLetter(value: string) {
  const match = value.normalize("NFC").match(/[\p{L}\p{N}]/u);
  return match ? match[0]!.toUpperCase() : "";
}

/** Initials for the header, e.g. `P.E.` — never a full contact string. */
export function profileInitials(firstName: string, lastName: string): string {
  const first = firstLetter(firstName);
  const last = firstLetter(lastName);
  if (first && last) return `${first}.${last}.`;
  if (first) return `${first}.`;
  if (last) return `${last}.`;
  return "";
}

/**
 * Initials shown next to the Open Community logo (e.g. `P.E.`).
 * Never email, phone, or a full first name in the chrome.
 */
export function headerDisplayName(profile: Pick<LocalProfile, "firstName" | "lastName" | "email" | "phone">): string {
  const first = sanitizePersonName(profile.firstName);
  const last = sanitizePersonName(profile.lastName);
  if (looksLikeEmail(first) || looksLikePhone(first)) {
    return profileInitials("", last) || "";
  }
  return profileInitials(first, last);
}

export function emptyProfileInput(): LocalProfileInput {
  return { firstName: "", lastName: "", email: "", phone: "" };
}

export function inputFromProfile(profile: LocalProfile): LocalProfileInput {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
  };
}

export function profileFormIssues(input: LocalProfileInput): LocalProfileIssue[] {
  const issues: LocalProfileIssue[] = [];
  if (!sanitizePersonName(input.firstName)) issues.push("firstName");
  if (!sanitizePersonName(input.lastName)) issues.push("lastName");
  if (!sanitizeProfileEmail(input.email)) issues.push("email");
  if (!sanitizeProfilePhone(input.phone)) issues.push("phone");
  return issues;
}

export function profileFromForm(
  input: LocalProfileInput,
  existing: LocalProfile | null = null,
  now = () => new Date().toISOString(),
  createId: () => string = generateOpcMemberId,
): LocalProfile | null {
  if (profileFormIssues(input).length) return null;
  const stamp = now();
  const id = existing && isOpcMemberId(existing.id) ? existing.id : createId();
  return {
    id,
    firstName: sanitizePersonName(input.firstName),
    lastName: sanitizePersonName(input.lastName),
    email: sanitizeProfileEmail(input.email),
    phone: sanitizeProfilePhone(input.phone),
    createdAt: existing?.createdAt || stamp,
    updatedAt: stamp,
  };
}

export function parseStoredProfile(raw: unknown): LocalProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const firstName = sanitizePersonName(record.firstName);
  const lastName = sanitizePersonName(record.lastName);
  const email = sanitizeProfileEmail(record.email);
  const phone = sanitizeProfilePhone(record.phone);
  if (!firstName || !lastName || !email || !phone) return null;
  const id = isOpcMemberId(record.id) ? record.id : "";
  if (!id) return null;
  return {
    id,
    firstName,
    lastName,
    email,
    phone,
    createdAt: typeof record.createdAt === "string" && record.createdAt ? record.createdAt : "",
    updatedAt: typeof record.updatedAt === "string" && record.updatedAt ? record.updatedAt : "",
  };
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

export function readLocalProfile(store?: Storage): LocalProfile | null {
  try {
    const raw = durableGet(LOCAL_PROFILE_KEY, storageOf(store));
    if (!raw) return null;
    return parseStoredProfile(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeLocalProfile(profile: LocalProfile, store?: Storage) {
  durableSet(LOCAL_PROFILE_KEY, JSON.stringify(profile), storageOf(store));
  emitLocalProfile();
}

const listeners = new Set<() => void>();

export function subscribeLocalProfile(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function emitLocalProfile() {
  listeners.forEach((listener) => listener());
}

export function defaultRegisterShareBlurb(
  url: string,
  firstName: string,
  locale: "fr" | "en" | "es" = "fr",
  memberId = "",
) {
  const name = sanitizePersonName(firstName);
  const safeName = name && !looksLikeEmail(name) && !looksLikePhone(name) ? name : "";
  const codeLine =
    memberId && isOpcMemberId(memberId)
      ? locale === "en"
        ? `\nMember code: ${memberId}`
        : locale === "es"
          ? `\nCódigo de miembro: ${memberId}`
          : `\nNuméro membre : ${memberId}`
      : "";
  if (locale === "en") {
    const who = safeName ? `${safeName} invites you to Open Community.` : "You're invited to Open Community.";
    return `${who}\nRegister on your device (no password): ${url}${codeLine}`;
  }
  if (locale === "es") {
    const who = safeName
      ? `${safeName} te invita a Open Community.`
      : "Te invitan a Open Community.";
    return `${who}\nInscríbete en tu aparato (sin contraseña): ${url}${codeLine}`;
  }
  const who = safeName ? `${safeName} t’invite sur Open Community.` : "On t’invite sur Open Community.";
  return `${who}\nInscris-toi sur ton appareil (sans mot de passe) : ${url}${codeLine}`;
}

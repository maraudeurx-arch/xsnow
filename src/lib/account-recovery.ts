/**
 * Account recovery by personal code — design converged by Popol,
 * Indiana Lane (IA) and Yves Knicks (IA) on 2026-11-11.
 *
 * Reality this serves: in many OPC communities phones are lost or stolen
 * often — including inside families. Today OPC keeps everything on the
 * device ("soft-launch privacy: nothing here is a remote account"), so a
 * lost phone means a lost profile. Recovery is therefore OPT-IN: the
 * person protects her account by choosing a short secret code only she
 * knows (a word she remembers, or 4–6 digits — the mobile-money model).
 *
 * Rules (Indiana's design, 2026-11-11):
 * - The code is CHOSEN by the person, never issued and never displayed
 *   again by the app after registration, so a relative who opens the
 *   phone cannot read it.
 * - The person is invited to write it on paper, stored away from the
 *   phone. A copy may optionally go to an email or a second number —
 *   never required (many people have no email; an SMS follows the SIM,
 *   which is often stolen with the phone).
 * - On a new phone, a big « J'ai déjà un compte » button asks for the
 *   code; everything comes back (avatar, profile, ideas) and the old
 *   device is cut immediately.
 *
 * This module is the pure, testable core: normalization, validation,
 * salted hashing and constant-time verification. It stores NOTHING and
 * never sees a network. Server storage (hash + salt + synced copy) and
 * the screens are separate lots; the code itself is never persisted,
 * logged or sent anywhere in clear text beyond the registration call.
 */

export const RECOVERY_CODE_MIN_WORD_LENGTH = 5;
export const RECOVERY_PIN_MIN_LENGTH = 4;
export const RECOVERY_PIN_MAX_LENGTH = 6;

/** PBKDF2 work factor for the stored hash (WebCrypto, SHA-256). */
export const RECOVERY_PBKDF2_ITERATIONS = 150_000;
export const RECOVERY_SALT_BYTES = 16;

export type RecoveryCodeKind = "word" | "pin";

export type RecoveryCodeValidation =
  | { ok: true; kind: RecoveryCodeKind; normalized: string }
  | { ok: false; reason: "empty" | "too_short" | "too_long" | "trivial" | "mixed" };

/**
 * Normalize what the person types, the same way at registration and at
 * recovery: case and accents do not matter for a word, spaces and
 * separators do not matter anywhere. « Éléphant », « elephant » and
 * « ELEPHANT » are the same code; « 12 34 » and « 1234 » are the same PIN.
 */
export function normalizeRecoveryCode(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s\-_.]+/g, "");
}

const TRIVIAL_WORDS = new Set([
  "password",
  "motdepasse",
  "azerty",
  "qwerty",
  "soleil",
  "bonjour",
  "opencommunity",
  "aaaaa",
  "abcde",
  "12345",
]);

function isTrivialPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true; // 0000, 1111…
  const ascending = "0123456789";
  const descending = "9876543210";
  return ascending.includes(pin) || descending.includes(pin); // 1234, 4321…
}

/**
 * Validate a chosen code. A word: at least 5 letters after
 * normalization. A PIN: 4–6 digits. Letters and digits mixed are
 * rejected — one simple thing to remember, nothing to hesitate over.
 * Trivial codes (1234, 0000, « password »…) are refused kindly: they
 * are exactly what a thief — or a curious relative — tries first.
 */
export function validateRecoveryCode(input: string): RecoveryCodeValidation {
  const normalized = normalizeRecoveryCode(input ?? "");
  if (!normalized) return { ok: false, reason: "empty" };
  const hasLetters = /[a-z]/.test(normalized);
  const hasDigits = /\d/.test(normalized);
  if (hasLetters && hasDigits) return { ok: false, reason: "mixed" };
  if (hasDigits) {
    if (normalized.length < RECOVERY_PIN_MIN_LENGTH) return { ok: false, reason: "too_short" };
    if (normalized.length > RECOVERY_PIN_MAX_LENGTH) return { ok: false, reason: "too_long" };
    if (isTrivialPin(normalized)) return { ok: false, reason: "trivial" };
    return { ok: true, kind: "pin", normalized };
  }
  if (normalized.length < RECOVERY_CODE_MIN_WORD_LENGTH) return { ok: false, reason: "too_short" };
  if (TRIVIAL_WORDS.has(normalized)) return { ok: false, reason: "trivial" };
  if (/^(.)\1+$/.test(normalized)) return { ok: false, reason: "trivial" };
  return { ok: true, kind: "word", normalized };
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Random salt for one account's stored recovery record. */
export function generateRecoverySalt(): string {
  const salt = new Uint8Array(RECOVERY_SALT_BYTES);
  crypto.getRandomValues(salt);
  return bytesToBase64(salt);
}

/**
 * Salted PBKDF2 hash of the normalized code. Only this hash (and the
 * salt) may ever be stored server-side — never the code itself.
 */
export async function hashRecoveryCode(normalized: string, saltB64: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(normalized), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBytes(saltB64) as BufferSource,
      iterations: RECOVERY_PBKDF2_ITERATIONS,
    },
    keyMaterial,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

/** Constant-time comparison of two base64 hashes. */
export function recoveryHashMatches(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verify a typed code against a stored salted hash. */
export async function verifyRecoveryCode(
  input: string,
  saltB64: string,
  expectedHashB64: string,
): Promise<boolean> {
  const validation = validateRecoveryCode(input);
  if (!validation.ok) return false;
  const actual = await hashRecoveryCode(validation.normalized, saltB64);
  return recoveryHashMatches(actual, expectedHashB64);
}

/**
 * What the server may store for one protected account. The code itself
 * appears NOWHERE in this record — only its salted hash.
 */
export interface RecoveryRecord {
  codeHash: string;
  salt: string;
  kind: RecoveryCodeKind;
  createdAt: string;
  /** Optional copy destination chosen by the person (email or second number). */
  copyTo?: string;
}

export type RecoveryFailureReason = Extract<RecoveryCodeValidation, { ok: false }>["reason"];

/** Build the storable record for a freshly chosen code. */
export async function createRecoveryRecord(
  input: string,
  opts: { copyTo?: string; now?: Date } = {},
): Promise<{ ok: true; record: RecoveryRecord } | { ok: false; reason: RecoveryFailureReason }> {
  const validation = validateRecoveryCode(input);
  if (!validation.ok) return { ok: false, reason: validation.reason };
  const salt = generateRecoverySalt();
  const codeHash = await hashRecoveryCode(validation.normalized, salt);
  return {
    ok: true,
    record: {
      codeHash,
      salt,
      kind: validation.kind,
      createdAt: (opts.now ?? new Date()).toISOString(),
      ...(opts.copyTo ? { copyTo: opts.copyTo } : {}),
    },
  };
}

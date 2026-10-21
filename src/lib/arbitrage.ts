/**
 * HITL arbitration (Human-In-The-Loop) — shared, framework-free logic.
 * Used by the browser (/arbitrage) and by the Worker (workers/xsnow-chat/src/arbitrage.ts).
 *
 * Privacy by design: the parties (AI agents) only ever receive a signed attestation
 * (pseudonymous arbiter id, verification level, timestamp, hashes). Never the ID photo,
 * the ID number, names, or face images.
 */

export const ARBITER_STATUSES = ["pending", "verified", "rejected"] as const;
export type ArbiterStatus = (typeof ARBITER_STATUSES)[number];

export const ID_DOC_TYPES = ["passport", "national_id", "driver_license", "residence_permit"] as const;
export type IdDocType = (typeof ID_DOC_TYPES)[number];

/** ID photo as JPEG/PNG/WebP base64, after in-browser compression. */
export const ID_PHOTO_MAX_BYTES = 409_600;
/** Raw ID records are purged this long after review (minimal retention). */
export const ID_RETENTION_DAYS = 90;
/** Similarity at/above which the browser face match is considered "likely same person". */
export const FACE_MATCH_THRESHOLD = 0.55;

/** Bump when the explanation modal (training fee, pay split) changes. */
export const ARBITER_TERMS_VERSION = "2026-10-20.v1";

export type TermsAcceptance = { version: string; acceptedAt: string };

export function parseTermsAcceptance(raw: unknown): TermsAcceptance | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== ARBITER_TERMS_VERSION) return null;
  const at = typeof r.acceptedAt === "string" ? r.acceptedAt : "";
  if (Number.isNaN(Date.parse(at))) return null;
  return { version: ARBITER_TERMS_VERSION, acceptedAt: new Date(at).toISOString() };
}

export type FaceCheck = {
  /** 0..1 similarity between selfie and ID photo embeddings, or null if unavailable. */
  score: number | null;
  /** Liveness challenge passed in the browser (head turn left + right). */
  liveness: boolean;
  method: string;
};

export type ArbiterApplication = {
  consent: true;
  lastName: string;
  firstName: string;
  docType: IdDocType;
  docNumber: string;
  issuingCountry: string;
  expiryDate: string;
  idPhotoBase64: string;
  idPhotoMime: "image/jpeg" | "image/png" | "image/webp";
  face: FaceCheck;
  opcId?: string;
  terms: TermsAcceptance;
};

export type VerificationLevel = "id_reviewed+face_auto" | "id_reviewed+face_reviewed";

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  // strip control chars & angle brackets; collapse whitespace
  return value
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function base64ByteLength(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseArbiterApplication(raw: unknown, now: Date = new Date()): ParseResult<ArbiterApplication> {
  if (!raw || typeof raw !== "object") return { ok: false, error: "invalid" };
  const r = raw as Record<string, unknown>;
  if (r.consent !== true) return { ok: false, error: "consent_required" };
  const terms = parseTermsAcceptance(r.terms);
  if (!terms) return { ok: false, error: "terms_required" };
  const lastName = cleanText(r.lastName, 80);
  const firstName = cleanText(r.firstName, 80);
  if (!lastName || !firstName) return { ok: false, error: "name_required" };
  const docType = r.docType as IdDocType;
  if (!ID_DOC_TYPES.includes(docType)) return { ok: false, error: "doc_type" };
  const docNumber = cleanText(r.docNumber, 40).toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9-]{4,40}$/.test(docNumber)) return { ok: false, error: "doc_number" };
  const issuingCountry = cleanText(r.issuingCountry, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(issuingCountry)) return { ok: false, error: "country" };
  const expiryDate = cleanText(r.expiryDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) || Number.isNaN(Date.parse(expiryDate))) {
    return { ok: false, error: "expiry" };
  }
  if (expiryDate < todayIso(now)) return { ok: false, error: "expired" };
  const idPhotoMime = r.idPhotoMime as ArbiterApplication["idPhotoMime"];
  if (!["image/jpeg", "image/png", "image/webp"].includes(idPhotoMime)) return { ok: false, error: "photo_type" };
  const idPhotoBase64 = typeof r.idPhotoBase64 === "string" ? r.idPhotoBase64.trim() : "";
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(idPhotoBase64)) return { ok: false, error: "photo" };
  const bytes = base64ByteLength(idPhotoBase64);
  if (bytes < 1 || bytes > ID_PHOTO_MAX_BYTES) return { ok: false, error: "photo_size" };
  const face = parseFaceCheck(r.face);
  const opcId = cleanText(r.opcId, 40) || undefined;
  return {
    ok: true,
    value: {
      consent: true,
      lastName,
      firstName,
      docType,
      docNumber,
      issuingCountry,
      expiryDate,
      idPhotoBase64,
      idPhotoMime,
      face,
      opcId,
      terms,
    },
  };
}

/** Browser face result {score, liveness, method}; never a face image. */
export function parseFaceCheck(raw: unknown): FaceCheck {
  const f = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const score =
    typeof f.score === "number" && Number.isFinite(f.score) ? Math.min(1, Math.max(0, f.score)) : null;
  return { score, liveness: f.liveness === true, method: cleanText(f.method, 60) || "none" };
}

/** Automatic face verdict. Never final: an admin always reviews before "verified". */
export function faceVerdict(face: FaceCheck): "likely_match" | "low_score" | "unavailable" {
  if (face.score === null || !face.liveness) return "unavailable";
  return face.score >= FACE_MATCH_THRESHOLD ? "likely_match" : "low_score";
}

// ---------- crypto helpers (WebCrypto: Node >= 20, Cloudflare Workers, browsers) ----------

const enc = new TextEncoder();

export function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64url(bytes: Uint8Array): string {
  return bytesToB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(data: string | Uint8Array<ArrayBuffer>): Promise<string> {
  const buf = typeof data === "string" ? enc.encode(data) : data;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stable JSON (sorted keys) so signatures are reproducible by any verifier. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}

/** AES-256-GCM key from a base64 32-byte secret (ARBITER_ENC_KEY). */
export async function importEncKey(b64Secret: string): Promise<CryptoKey> {
  const raw = b64ToBytes(b64Secret);
  if (raw.length !== 32) throw new Error("ARBITER_ENC_KEY must be 32 bytes base64");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptString(key: CryptoKey, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain)));
  return `${bytesToB64(iv)}.${bytesToB64(ct)}`;
}

export async function decryptString(key: CryptoKey, sealed: string): Promise<string> {
  const [iv, ct] = sealed.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(iv) }, key, b64ToBytes(ct));
  return new TextDecoder().decode(pt);
}

/** Ed25519 signing key from base64 PKCS#8 (ARBITER_SIGNING_KEY). */
export async function importSigningKey(b64Pkcs8: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("pkcs8", b64ToBytes(b64Pkcs8), { name: "Ed25519" }, false, ["sign"]);
}

export async function importVerifyKey(b64Spki: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("spki", b64ToBytes(b64Spki), { name: "Ed25519" }, false, ["verify"]);
}

// ---------- attestation ----------

export type DecisionOrigin =
  | { kind: "ai_suggestion_accepted"; model: string; arbiterId: string }
  | { kind: "human_override"; arbiterId: string; rejectedSuggestionReason: string };

export type HumanAttestation = {
  v: 1;
  issuer: "opencommunity.app/arbitrage";
  caseId: string;
  decisionHash: string;
  /** Pseudonymous, stable per arbiter. Not the name, not the ID number. */
  arbiterId: string;
  verificationLevel: VerificationLevel;
  /** sha256 of the encrypted identity record + face result, as stored at review time. */
  identityHash: string;
  faceMatch: { score: number | null; liveness: boolean; verdict: string };
  reputation: number;
  decidedAt: string;
};

export type SignedAttestation = HumanAttestation & { alg: "Ed25519"; signature: string };

export async function signAttestation(key: CryptoKey, att: HumanAttestation): Promise<SignedAttestation> {
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, key, enc.encode(canonicalJson(att))));
  return { ...att, alg: "Ed25519", signature: b64url(sig) };
}

export async function verifyAttestation(key: CryptoKey, signed: SignedAttestation): Promise<boolean> {
  const { signature, alg, ...att } = signed;
  if (alg !== "Ed25519") return false;
  const sig = b64ToBytes(signature.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((signature.length + 3) % 4));
  return crypto.subtle.verify({ name: "Ed25519" }, key, sig, enc.encode(canonicalJson(att)));
}

/** Keys that must never appear in a payload sent to the parties. */
export const FORBIDDEN_PARTY_KEYS = [
  "idPhotoBase64",
  "docNumber",
  "lastName",
  "firstName",
  "selfie",
  "faceImage",
  "idPhoto",
] as const;

export function assertNoPii(payload: unknown): void {
  const text = JSON.stringify(payload);
  for (const k of FORBIDDEN_PARTY_KEYS) {
    if (text.includes(`"${k}"`)) throw new Error(`PII key in party payload: ${k}`);
  }
}

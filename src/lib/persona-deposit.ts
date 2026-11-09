/**
 * « Monétise-toi : image et voix » — persona deposit for the digital-twin
 * image & voice bank (Popol 07/11 + 09/11/2026: live, connected to the twin).
 *
 * Flow: choice (voice and/or image + pseudonym + country) → consent (the
 * gate: 18+, own voice/image only, scope, withdrawal any time with real
 * deletion, forbidden uses, no income guarantee) → voice → image + video →
 * selfie video saying a 6-digit code (self-only / liveness check, reviewed by
 * the team) → deposit. Nothing opens before the consent is recorded; a
 * finished deposit is only « en vérification » — no fabricated verdict.
 *
 * Media are kept on the device (persona-media.ts) and uploaded, with the
 * consent record, to the xsnow-chat Worker bank route (PERSONA_DEPOSIT_ROUTE,
 * private R2 storage). The person keeps a withdraw token on the device: one
 * tap withdraws and deletes the media from the bank.
 */

import { durableGet, durableSet } from "./durable-storage.ts";
import {
  isLivenessCode,
  newLivenessCode,
  requiredMediaFor,
  TWIN_BANK_CONSENT_VERSION,
  TWIN_BANK_MAX_BYTES,
} from "./twin-bank.ts";

/**
 * Master switch. TRUE since 09/11/2026: Indiana's consent text v1
 * (TWIN_BANK_CONSENT_VERSION, FR/EN/ES) replaced the provisional copy, at
 * Popol's request that the section go live for the twin tests.
 */
export const PERSONA_COLLECTION_ENABLED = true;

/** Version of the consent text the person accepted (shared with the Worker). */
export const PERSONA_CONSENT_TEXT_VERSION = TWIN_BANK_CONSENT_VERSION;

/** Durable-storage key for the current deposit metadata (media live in IndexedDB). */
export const PERSONA_DEPOSIT_KEY = "xsnow.personaDeposit";

export const PERSONA_STEPS = ["choice", "consent", "voice", "media", "biometry", "done"] as const;
export type PersonaStep = (typeof PERSONA_STEPS)[number];

export const PERSONA_MEDIA_KINDS = ["voice", "image", "video", "selfie"] as const;
export type PersonaMediaKind = (typeof PERSONA_MEDIA_KINDS)[number];

export type PersonaMediaInfo = {
  type: string;
  size: number;
};

export type PersonaConsentRecord = {
  /** Epoch ms of the acceptance. */
  acceptedAt: number;
  /** Version of the consent text that was shown (see PERSONA_CONSENT_TEXT_VERSION). */
  textVersion: string;
};

export type PersonaConsentChecks = {
  /** « J'ai lu et j'accepte ces conditions. » */
  terms: boolean;
  /** « J'ai 18 ans ou plus. » — adults only. */
  adult: boolean;
  /** « Je comprends qu'aucun revenu n'est garanti. » */
  compensation: boolean;
  /** « Ce sont ma propre voix et ma propre image. » */
  selfOnly: boolean;
};

export function emptyPersonaConsentChecks(): PersonaConsentChecks {
  return { terms: false, adult: false, compensation: false, selfOnly: false };
}

/** The gate: every box must be ticked before anything else opens. */
export function personaConsentComplete(checks: PersonaConsentChecks): boolean {
  return (
    checks.terms === true &&
    checks.adult === true &&
    checks.compensation === true &&
    checks.selfOnly === true
  );
}

export type PersonaDepositStatus = "en-cours" | "en-verification" | "retire";
export type PersonaUploadStatus = "pending" | "sent" | "failed" | "not-configured";
export type PersonaOffer = { voice: boolean; image: boolean };

export type PersonaDeposit = {
  id: string;
  createdAt: number;
  updatedAt: number;
  offer: PersonaOffer;
  pseudonym: string;
  country: string;
  /** 6-digit code said aloud in the selfie video. */
  livenessCode: string;
  consent: PersonaConsentRecord | null;
  media: Partial<Record<PersonaMediaKind, PersonaMediaInfo>>;
  status: PersonaDepositStatus;
  upload: PersonaUploadStatus;
  /** Returned by the bank on upload; kept on the device only, needed to withdraw. */
  withdrawToken: string;
};

/** Dossier number shown to the person, e.g. « persona-m3k9x2-7f4a ». */
export function newPersonaDepositId(now: number, random: number): string {
  const stamp = Math.max(0, Math.floor(now)).toString(36);
  const suffix = Math.floor(Math.abs(random) * 0xffffff)
    .toString(16)
    .padStart(4, "0")
    .slice(0, 4);
  return `persona-${stamp}-${suffix}`;
}

export function emptyPersonaDeposit(id: string, now: number, random: () => number = Math.random): PersonaDeposit {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    offer: { voice: false, image: false },
    pseudonym: "",
    country: "",
    livenessCode: newLivenessCode(random),
    consent: null,
    media: {},
    status: "en-cours",
    upload: "pending",
    withdrawToken: "",
  };
}

export function recordPersonaChoice(
  deposit: PersonaDeposit,
  choice: { offer: PersonaOffer; pseudonym: string; country: string },
  now: number,
): PersonaDeposit {
  return {
    ...deposit,
    offer: { voice: choice.offer.voice === true, image: choice.offer.image === true },
    pseudonym: choice.pseudonym,
    country: choice.country,
    updatedAt: now,
  };
}

export function personaChoiceComplete(deposit: PersonaDeposit): boolean {
  return (
    (deposit.offer.voice || deposit.offer.image) &&
    deposit.pseudonym.trim().length >= 2 &&
    deposit.country.trim().length >= 2
  );
}

export function recordPersonaConsent(
  deposit: PersonaDeposit,
  now: number,
): PersonaDeposit {
  return {
    ...deposit,
    consent: { acceptedAt: now, textVersion: PERSONA_CONSENT_TEXT_VERSION },
    updatedAt: now,
  };
}

export function recordPersonaMedia(
  deposit: PersonaDeposit,
  kind: PersonaMediaKind,
  info: PersonaMediaInfo,
  now: number,
): PersonaDeposit {
  return {
    ...deposit,
    media: { ...deposit.media, [kind]: { type: info.type, size: info.size } },
    updatedAt: now,
  };
}

export function personaHasMedia(deposit: PersonaDeposit, kind: PersonaMediaKind): boolean {
  return deposit.media[kind] != null;
}

/** Whether a step applies to this offer (voice step only for a voice offer, media only for an image offer). */
export function personaStepApplies(deposit: PersonaDeposit, step: PersonaStep): boolean {
  if (step === "voice") return deposit.offer.voice;
  if (step === "media") return deposit.offer.image;
  return true;
}

/** The furthest step the deposit may open — earlier steps stay revisitable, later ones never. */
export function personaFurthestStep(deposit: PersonaDeposit): PersonaStep {
  // A withdrawn dossier has no media left: it stays on the final screen.
  if (deposit.status === "retire") return "done";
  if (!personaChoiceComplete(deposit)) return "choice";
  if (!deposit.consent) return "consent";
  if (deposit.offer.voice && !personaHasMedia(deposit, "voice")) return "voice";
  if (deposit.offer.image && (!personaHasMedia(deposit, "image") || !personaHasMedia(deposit, "video"))) return "media";
  if (!personaHasMedia(deposit, "selfie")) return "biometry";
  return "done";
}

export function canOpenPersonaStep(deposit: PersonaDeposit, step: PersonaStep): boolean {
  if (!personaStepApplies(deposit, step)) return false;
  return PERSONA_STEPS.indexOf(step) <= PERSONA_STEPS.indexOf(personaFurthestStep(deposit));
}

/** Next applicable step after `step` (skips voice or media when not offered). */
export function nextPersonaStep(deposit: PersonaDeposit, step: PersonaStep): PersonaStep {
  for (let i = PERSONA_STEPS.indexOf(step) + 1; i < PERSONA_STEPS.length; i += 1) {
    if (personaStepApplies(deposit, PERSONA_STEPS[i])) return PERSONA_STEPS[i];
  }
  return "done";
}

export function prevPersonaStep(deposit: PersonaDeposit, step: PersonaStep): PersonaStep {
  for (let i = PERSONA_STEPS.indexOf(step) - 1; i >= 0; i -= 1) {
    if (personaStepApplies(deposit, PERSONA_STEPS[i])) return PERSONA_STEPS[i];
  }
  return "choice";
}

/** Applicable steps, for the « Étape x sur y » counter. */
export function personaVisibleSteps(deposit: PersonaDeposit): PersonaStep[] {
  return PERSONA_STEPS.filter((st) => personaStepApplies(deposit, st));
}

/** Whether a step's own requirement is satisfied (drives the Continue buttons). */
export function personaStepSatisfied(deposit: PersonaDeposit, step: PersonaStep): boolean {
  switch (step) {
    case "choice":
      return personaChoiceComplete(deposit);
    case "consent":
      return deposit.consent != null;
    case "voice":
      return personaHasMedia(deposit, "voice");
    case "media":
      return personaHasMedia(deposit, "image") && personaHasMedia(deposit, "video");
    case "biometry":
      return personaHasMedia(deposit, "selfie");
    case "done":
      return personaFurthestStep(deposit) === "done";
  }
}

/* ------------------------------------------------------------------ */
/* Upload validation                                                   */
/* ------------------------------------------------------------------ */

export const PERSONA_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PERSONA_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

/** Same ceilings as the Worker bank route (total under the Workers 100 MB body limit). */
export const PERSONA_IMAGE_MAX_BYTES = TWIN_BANK_MAX_BYTES.image;
export const PERSONA_VIDEO_MAX_BYTES = TWIN_BANK_MAX_BYTES.video;
export const PERSONA_SELFIE_MAX_BYTES = TWIN_BANK_MAX_BYTES.selfie;
export const PERSONA_VOICE_MAX_BYTES = TWIN_BANK_MAX_BYTES.voice;

export type PersonaFileIssue = "empty" | "type" | "size";

export function personaFileIssue(
  kind: Exclude<PersonaMediaKind, "voice">,
  file: { type: string; size: number },
): PersonaFileIssue | null {
  if (!file || !(file.size > 0)) return "empty";
  if (kind === "image") {
    if (!(PERSONA_IMAGE_TYPES as readonly string[]).includes(file.type)) return "type";
    if (file.size > PERSONA_IMAGE_MAX_BYTES) return "size";
    return null;
  }
  if (!(PERSONA_VIDEO_TYPES as readonly string[]).includes(file.type)) return "type";
  const max = kind === "selfie" ? PERSONA_SELFIE_MAX_BYTES : PERSONA_VIDEO_MAX_BYTES;
  if (file.size > max) return "size";
  return null;
}

/* ------------------------------------------------------------------ */
/* Recorder mime picking (pure, so it is testable without a browser)   */
/* ------------------------------------------------------------------ */

export const PERSONA_AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

export const PERSONA_VIDEO_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm",
  "video/mp4",
] as const;

export function pickRecorderMimeType(
  candidates: readonly string[],
  isSupported: (mime: string) => boolean,
): string {
  for (const mime of candidates) {
    try {
      if (isSupported(mime)) return mime;
    } catch {
      // A throwing isTypeSupported must not break recording — keep looking.
    }
  }
  return "";
}

/* ------------------------------------------------------------------ */
/* Persistence (metadata only — media blobs live in persona-media.ts)  */
/* ------------------------------------------------------------------ */

function parseMediaInfo(raw: unknown): PersonaMediaInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as { type?: unknown; size?: unknown };
  const type = typeof record.type === "string" ? record.type.slice(0, 80) : "";
  const size = typeof record.size === "number" && record.size >= 0 ? Math.floor(record.size) : 0;
  if (!type && size === 0) return null;
  return { type, size };
}

/** Whitelist parse of a stored deposit; anything unexpected is dropped. */
export function parsePersonaDeposit(raw: unknown): PersonaDeposit | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!/^persona-[a-z0-9]+-[a-z0-9]+$/.test(id)) return null;
  const createdAt = typeof record.createdAt === "number" ? record.createdAt : 0;
  const updatedAt = typeof record.updatedAt === "number" ? record.updatedAt : createdAt;

  let consent: PersonaConsentRecord | null = null;
  if (record.consent && typeof record.consent === "object") {
    const c = record.consent as { acceptedAt?: unknown; textVersion?: unknown };
    if (typeof c.acceptedAt === "number" && c.acceptedAt > 0) {
      consent = {
        acceptedAt: c.acceptedAt,
        textVersion: typeof c.textVersion === "string" ? c.textVersion.slice(0, 40) : "",
      };
    }
  }
  // A consent given on an older text must be given again on the current one.
  if (consent && consent.textVersion !== PERSONA_CONSENT_TEXT_VERSION) consent = null;

  const media: PersonaDeposit["media"] = {};
  if (record.media && typeof record.media === "object") {
    for (const kind of PERSONA_MEDIA_KINDS) {
      const info = parseMediaInfo((record.media as Record<string, unknown>)[kind]);
      if (info) media[kind] = info;
    }
  }
  const offerRaw = (record.offer && typeof record.offer === "object" ? record.offer : {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

  return {
    id,
    createdAt,
    updatedAt,
    offer: { voice: offerRaw.voice === true, image: offerRaw.image === true },
    pseudonym: str(record.pseudonym, 40),
    country: str(record.country, 40),
    livenessCode: isLivenessCode(record.livenessCode) ? record.livenessCode : newLivenessCode(),
    consent,
    media,
    status:
      record.status === "en-verification" ? "en-verification" : record.status === "retire" ? "retire" : "en-cours",
    upload:
      record.upload === "sent"
        ? "sent"
        : record.upload === "failed"
          ? "failed"
          : record.upload === "not-configured"
            ? "not-configured"
            : "pending",
    withdrawToken: /^[A-Za-z0-9_-]{20,100}$/.test(str(record.withdrawToken, 100)) ? str(record.withdrawToken, 100) : "",
  };
}

export function loadPersonaDeposit(): PersonaDeposit | null {
  const raw = durableGet(PERSONA_DEPOSIT_KEY);
  if (!raw) return null;
  try {
    return parsePersonaDeposit(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function savePersonaDeposit(deposit: PersonaDeposit): void {
  durableSet(PERSONA_DEPOSIT_KEY, JSON.stringify(deposit));
}

export function clearPersonaDeposit(): void {
  durableSet(PERSONA_DEPOSIT_KEY, "");
}

/* ------------------------------------------------------------------ */
/* Upload to the twin bank + withdrawal                                */
/* ------------------------------------------------------------------ */

/** xsnow-chat Worker bank route (persona-bank.ts). Private R2 storage, never public URLs. */
export const PERSONA_DEPOSIT_ROUTE = "/persona-deposits";
export const PERSONA_WITHDRAW_ROUTE = "/persona-deposits/withdraw";
export const PERSONA_DEPOSIT_POST_TIMEOUT_MS = 120_000;

export function chatApiBase(base?: string): string {
  const raw =
    base ||
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_CHAT_API_URL || process.env.NEXT_PUBLIC_CHAT_API)) ||
    "https://xsnow-chat.xsnowopc.workers.dev";
  return String(raw).replace(/\/+$/, "");
}

export function personaDepositEndpoint(base?: string) {
  return `${chatApiBase(base)}${PERSONA_DEPOSIT_ROUTE}`;
}

/** Consent + offer metadata sent with the media (no e-mail, no real name, no amount). */
export function personaDepositMeta(deposit: PersonaDeposit) {
  return {
    id: deposit.id,
    pseudonym: deposit.pseudonym,
    country: deposit.country,
    offer: { ...deposit.offer },
    consent: {
      version: deposit.consent?.textVersion ?? "",
      acceptedAt: deposit.consent?.acceptedAt ?? 0,
      terms: deposit.consent != null,
      adult: deposit.consent != null,
      noIncomeGuarantee: deposit.consent != null,
      selfOnly: deposit.consent != null,
    },
    livenessCode: deposit.livenessCode,
  };
}

export type PersonaUploadResult =
  | { result: "sent"; withdrawToken: string }
  | { result: "failed" }
  | { result: "not-configured" };

/**
 * Upload the dossier (consent metadata + required media) to the bank.
 * « sent » only on ok + accepted + a withdraw token; a 503
 * storage_not_configured is reported honestly as « not-configured » (the
 * dossier then stays complete on the device and can be re-sent).
 */
export async function uploadPersonaDeposit(
  deposit: PersonaDeposit,
  loadBlob: (kind: PersonaMediaKind) => Promise<Blob | null>,
  fetchImpl: typeof fetch = fetch,
  base?: string,
): Promise<PersonaUploadResult> {
  const form = new FormData();
  form.set("meta", JSON.stringify(personaDepositMeta(deposit)));
  for (const kind of requiredMediaFor(deposit.offer)) {
    const blob = await loadBlob(kind);
    if (!blob) return { result: "failed" };
    form.set(kind, blob, `${kind}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PERSONA_DEPOSIT_POST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(personaDepositEndpoint(base), {
      method: "POST",
      body: form,
      credentials: "omit",
      signal: controller.signal,
    });
    let payload: Record<string, unknown> | null = null;
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch {
      payload = null;
    }
    if (response.status === 503 && payload?.error === "storage_not_configured") return { result: "not-configured" };
    if (!response.ok || !payload) return { result: "failed" };
    const token = typeof payload.withdrawToken === "string" ? payload.withdrawToken : "";
    return payload.ok === true && payload.accepted === true && token ? { result: "sent", withdrawToken: token } : { result: "failed" };
  } catch {
    return { result: "failed" };
  } finally {
    clearTimeout(timer);
  }
}

/** One-tap withdrawal: the bank deletes the media at once and hides the item from twins. */
export async function withdrawPersonaDeposit(
  deposit: PersonaDeposit,
  fetchImpl: typeof fetch = fetch,
  base?: string,
): Promise<"withdrawn" | "failed"> {
  if (!deposit.withdrawToken) return "failed";
  try {
    const response = await fetchImpl(`${chatApiBase(base)}${PERSONA_WITHDRAW_ROUTE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deposit.id, token: deposit.withdrawToken }),
      credentials: "omit",
    });
    if (!response.ok) return "failed";
    const payload = (await response.json()) as Record<string, unknown>;
    return payload?.ok === true && payload.status === "revoked" ? "withdrawn" : "failed";
  } catch {
    return "failed";
  }
}

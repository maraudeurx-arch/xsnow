/**
 * « Monétise-toi : image et voix » — persona deposit for the digital-twin
 * sound & image bank (decision by Popol, 07/11/2026: the section lives in
 * « Aider une IA » on the Earn Now board and must go live).
 *
 * Flow (5 steps): consent (the gate) → voice sample → image + video upload →
 * biometric selfie → deposit recap. Nothing is reachable before the consent
 * is accepted and recorded; the deposit ends in the honest status
 * « en vérification » — this module never fabricates an identity verdict.
 *
 * Everything stays on the device: metadata in durable storage (this file),
 * media blobs in IndexedDB (persona-media.ts). A best-effort notice with the
 * deposit METADATA ONLY is POSTed to a proposed Worker route
 * (PERSONA_DEPOSIT_ROUTE) — see the comment at postPersonaDepositNotice.
 * No price is ever attached: if the voice or image are used, the person
 * receives a small compensation whose amount is NOT yet fixed (set by
 * Indiana Lane (IA)).
 */

import { durableGet, durableSet } from "./durable-storage.ts";

/**
 * Master switch for the whole « Monétise-toi » collection journey.
 *
 * FALSE — and it must stay false until Indiana Lane (IA) validates the
 * definitive consent text. Her ruling (07/11/2026, relayed by Popol):
 * NOTHING may be collected while the consent text is unvalidated. Flip
 * this to true ONLY once her validated text — bracketed fields completed —
 * has replaced the provisional i18n copy (earnNow.personaMonetise).
 *
 * While false: the « Aider une IA » entry on the Earn Now board shows a
 * sober « En préparation » state, and the board itself renders no capture,
 * no upload and no deposit — even by direct navigation.
 */
export const PERSONA_COLLECTION_ENABLED = false;

/**
 * Version of the consent text the person accepted. The current text is
 * PROVISIONAL copy (i18n key earnNow.personaMonetise.consentItems) written
 * by the team until Indiana Lane (IA) delivers the definitive legal consent
 * form; bump this version when her text replaces it, so a recorded consent
 * always names the exact text that was accepted.
 */
export const PERSONA_CONSENT_TEXT_VERSION = "provisoire-2026-11-07";

/** Durable-storage key for the current deposit metadata (media live in IndexedDB). */
export const PERSONA_DEPOSIT_KEY = "xsnow.personaDeposit";

export const PERSONA_STEPS = ["consent", "voice", "media", "biometry", "done"] as const;
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
  /** « J'ai lu et j'accepte les conditions. » */
  terms: boolean;
  /** « J'ai 18 ans ou plus. » — adults only. */
  adult: boolean;
  /** « Je comprends que le montant de la compensation n'est pas encore fixé. » */
  compensation: boolean;
};

export function emptyPersonaConsentChecks(): PersonaConsentChecks {
  return { terms: false, adult: false, compensation: false };
}

/** The gate: every box must be ticked before anything else opens. */
export function personaConsentComplete(checks: PersonaConsentChecks): boolean {
  return checks.terms === true && checks.adult === true && checks.compensation === true;
}

export type PersonaDepositStatus = "en-cours" | "en-verification";
export type PersonaUploadStatus = "pending" | "sent" | "failed";

export type PersonaDeposit = {
  id: string;
  createdAt: number;
  updatedAt: number;
  consent: PersonaConsentRecord | null;
  media: Partial<Record<PersonaMediaKind, PersonaMediaInfo>>;
  status: PersonaDepositStatus;
  upload: PersonaUploadStatus;
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

export function emptyPersonaDeposit(id: string, now: number): PersonaDeposit {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    consent: null,
    media: {},
    status: "en-cours",
    upload: "pending",
  };
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

/** The furthest step the deposit may open — earlier steps stay revisitable, later ones never. */
export function personaFurthestStep(deposit: PersonaDeposit): PersonaStep {
  if (!deposit.consent) return "consent";
  if (!personaHasMedia(deposit, "voice")) return "voice";
  if (!personaHasMedia(deposit, "image") || !personaHasMedia(deposit, "video")) return "media";
  if (!personaHasMedia(deposit, "selfie")) return "biometry";
  return "done";
}

export function canOpenPersonaStep(deposit: PersonaDeposit, step: PersonaStep): boolean {
  return PERSONA_STEPS.indexOf(step) <= PERSONA_STEPS.indexOf(personaFurthestStep(deposit));
}

/** Whether a step's own requirement is satisfied (drives the Continue buttons). */
export function personaStepSatisfied(deposit: PersonaDeposit, step: PersonaStep): boolean {
  switch (step) {
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

/** Generous on-device ceilings; the server-side storage route is Indiana's call. */
export const PERSONA_IMAGE_MAX_BYTES = 15_000_000;
export const PERSONA_VIDEO_MAX_BYTES = 200_000_000;
export const PERSONA_SELFIE_MAX_BYTES = 200_000_000;

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

  const media: PersonaDeposit["media"] = {};
  if (record.media && typeof record.media === "object") {
    for (const kind of PERSONA_MEDIA_KINDS) {
      const info = parseMediaInfo((record.media as Record<string, unknown>)[kind]);
      if (info) media[kind] = info;
    }
  }

  return {
    id,
    createdAt,
    updatedAt,
    consent,
    media,
    status: record.status === "en-verification" ? "en-verification" : "en-cours",
    upload:
      record.upload === "sent" ? "sent" : record.upload === "failed" ? "failed" : "pending",
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
/* Best-effort deposit notice                                          */
/* ------------------------------------------------------------------ */

/**
 * Proposed Worker route for persona deposits. PROPOSED — the xsnow-chat
 * Worker has no /persona-deposits route yet: activation (route + media
 * storage) belongs to Indiana Lane (IA), because videos far exceed the
 * 400 KB e-mail attachment ceiling of the /business-ads pattern. Until she
 * activates it, the notice fails cleanly and the full dossier stays on the
 * person's device, status « en vérification ».
 */
export const PERSONA_DEPOSIT_ROUTE = "/persona-deposits";
export const PERSONA_DEPOSIT_POST_TIMEOUT_MS = 8_000;

export function personaDepositEndpoint(base?: string) {
  const raw =
    base ||
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_CHAT_API_URL || process.env.NEXT_PUBLIC_CHAT_API)) ||
    "https://xsnow-chat.xsnowopc.workers.dev";
  return `${String(raw).replace(/\/+$/, "")}${PERSONA_DEPOSIT_ROUTE}`;
}

export type PersonaDepositNotice = {
  id: string;
  createdAt: number;
  consent: { acceptedAt: number; textVersion: string } | null;
  media: Partial<Record<PersonaMediaKind, PersonaMediaInfo>>;
  status: PersonaDepositStatus;
};

/**
 * Metadata-only notice: NO media bytes, no name, no e-mail, no amount.
 * The media themselves never leave the device through this channel.
 */
export function personaDepositNotice(deposit: PersonaDeposit): PersonaDepositNotice {
  return {
    id: deposit.id,
    createdAt: deposit.createdAt,
    consent: deposit.consent
      ? { acceptedAt: deposit.consent.acceptedAt, textVersion: deposit.consent.textVersion }
      : null,
    media: { ...deposit.media },
    status: deposit.status,
  };
}

export type PersonaDepositPostResult = "sent" | "failed";

export async function postPersonaDepositNotice(
  deposit: PersonaDeposit,
  fetchImpl: typeof fetch = fetch,
): Promise<PersonaDepositPostResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PERSONA_DEPOSIT_POST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(personaDepositEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personaDepositNotice(deposit)),
      keepalive: true,
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) return "failed";
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      return "failed";
    }
    if (!payload || typeof payload !== "object") return "failed";
    const record = payload as { ok?: unknown; accepted?: unknown };
    return record.ok === true && record.accepted === true ? "sent" : "failed";
  } catch {
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

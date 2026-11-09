/**
 * Banque d'images et de voix des jumeaux numériques — Worker routes.
 *
 * Lenders (OPC « Monétise-toi ») deposit voice and/or image with a recorded
 * consent (18+, scope, revocation, real deletion, forbidden uses, no income
 * guarantee). Twin subscribers browse ONLY consented, non-withdrawn items and
 * record a use against their subscription — TEST MODE ONLY, nothing is charged
 * (TWIN_BANK_LIVE_BILLING = false).
 *
 *   POST /persona-deposits            multipart: meta (JSON) + voice|image|video|selfie files
 *   GET  /persona-deposits/status     ?id=&token=
 *   POST /persona-deposits/withdraw   {id, token} → media deleted from R2 at once
 *   GET  /persona-bank/review         Bearer PERSONA_ADMIN_SECRET → pending dossiers
 *   GET  /persona-bank/review/media   Bearer … ?id=&asset=
 *   POST /persona-bank/review         Bearer … {id, decision: approve|reject}
 *   GET  /twin-bank                   consented items (approved; + pending when TWIN_BANK_TEST_MODE=on)
 *   POST /twin-bank/use               {subscriberId, itemId, kind, acceptCost, acceptRules}
 *   GET  /twin-bank/usage             ?subscriberId=
 *   GET  /twin-bank/media             ?item=&asset=&sub=&exp=&sig=  (HMAC, short-lived)
 *   POST /twin-bank/subscribers       Bearer TWIN_APP_SECRET {twinAccountId, tier} → linked subscriberId
 *   POST /twin-bank/generate          {subscriberId, itemId, kind, prompt, outputSha256?, publishedUrl?}
 *                                     → banned-use filter, usage log line, « généré par IA » label + provenance
 *   GET  /twin-bank/provenance        ?id=  public check of an output label
 *   POST /twin-bank/report            {outputId?|itemId?, reason} « Signaler un abus »
 *   GET  /persona-deposits/usage      ?id=&token=  lender usage log (who used my voice/image, when)
 *
 * Full contract for the twin app: docs/jumeau-banque-api.md.
 * Storage: R2 binding PERSONA_BANK (private bucket, never public) + D1 (migrations 0016, 0017).
 * Without either binding every route answers 503 storage_not_configured.
 */

import {
  cleanCountry,
  cleanPseudonym,
  isLivenessCode,
  isPersonaId,
  isSubscriberId,
  isTwinBankKind,
  requiredMediaFor,
  twinBankMonth,
  twinBankPayoutAfter,
  twinBankSplit,
  TWIN_BANK_CONSENT_VERSION,
  TWIN_BANK_LIVE_BILLING,
  TWIN_BANK_MAX_BYTES,
  TWIN_BANK_MAX_TOTAL_BYTES,
  TWIN_BANK_PRICE_CAD_CENTS,
  type TwinBankKind,
} from "../../../src/lib/twin-bank.ts";
import {
  twinAudibleIntro,
  twinPromptIssue,
  twinProvenance,
  twinVisibleLabel,
  TWIN_REFUSALS_BEFORE_REVIEW,
} from "../../../src/lib/twin-safety.ts";

export type PersonaAsset = "voice" | "image" | "video" | "selfie";
const ASSETS: PersonaAsset[] = ["voice", "image", "video", "selfie"];

const MIME_OK: Record<PersonaAsset, RegExp> = {
  voice: /^audio\/(webm|mp4|ogg|mpeg|wav|x-m4a|aac)/,
  image: /^image\/(jpeg|png|webp)$/,
  video: /^video\/(mp4|webm|quicktime)/,
  selfie: /^video\/(mp4|webm|quicktime)/,
};

export type LenderStatus = "pending_review" | "approved" | "rejected" | "revoked";

export type LenderRow = {
  id: string;
  pseudonym: string;
  country: string;
  offer_voice: number;
  offer_image: number;
  consent_version: string;
  consent_at: number;
  liveness_code: string | null;
  status: LenderStatus;
  withdraw_hash: string;
  created_at: number;
  reviewed_at: number | null;
  revoked_at: number | null;
};

export type SampleRow = {
  lender_id: string;
  asset: PersonaAsset;
  r2_key: string;
  mime: string;
  size: number;
  created_at: number;
  deleted_at: number | null;
};

export type UsageRow = {
  subscriber_id: string;
  lender_id: string;
  kind: TwinBankKind;
  month: string;
  amount_cad_cents: number;
  lender_cents: number;
  opc_cents: number;
  platform_cents: number;
  payout_after: number;
  test_mode: number;
  created_at: number;
};

export type TwinTier = "decouverte" | "createur" | "pro";
/** Internal tier for an unlinked test-mode id that had to be suspended (never settable through the API). */
export type SubscriberTier = TwinTier | "test";
export const TWIN_TIERS: TwinTier[] = ["decouverte", "createur", "pro"];
/** Cahier Jumeau § 7.1: the bank is reserved to paid tiers. */
export const TWIN_BANK_TIERS: TwinTier[] = ["createur", "pro"];

export type SubscriberRow = {
  subscriber_id: string;
  account_hash: string;
  tier: SubscriberTier;
  linked_at: number;
  updated_at: number;
  suspended_at: number | null;
};

export type OutputRow = {
  id: string;
  subscriber_id: string;
  lender_id: string;
  kind: TwinBankKind;
  prompt_sha256: string;
  prompt_summary: string;
  output_sha256: string | null;
  published_url: string | null;
  provenance_json: string;
  signature: string;
  created_at: number;
};

export type RefusalRow = {
  subscriber_id: string;
  lender_id: string;
  reason: string;
  prompt_sha256: string;
  created_at: number;
  reviewed_at: number | null;
};

export type ReportRow = {
  id: string;
  output_id: string | null;
  lender_id: string | null;
  subscriber_id: string | null;
  reason: string;
  created_at: number;
  closed_at: number | null;
};

export interface BankStore {
  insertLender(row: LenderRow): Promise<boolean>;
  getLender(id: string): Promise<LenderRow | null>;
  updateLender(id: string, patch: Partial<Pick<LenderRow, "status" | "reviewed_at" | "revoked_at" | "liveness_code">>): Promise<void>;
  listLenders(statuses: LenderStatus[]): Promise<LenderRow[]>;
  insertSample(row: SampleRow): Promise<void>;
  samples(lenderId: string): Promise<SampleRow[]>;
  markSamplesDeleted(lenderId: string, at: number): Promise<void>;
  /** Returns false when the (subscriber, lender, kind, month) line already exists. */
  insertUsage(row: UsageRow): Promise<boolean>;
  usageFor(subscriberId: string, month: string): Promise<UsageRow[]>;
  usageForLender(lenderId: string): Promise<UsageRow[]>;
  getSubscriber(id: string): Promise<SubscriberRow | null>;
  upsertSubscriber(row: SubscriberRow): Promise<void>;
  setSubscriberSuspended(id: string, at: number | null): Promise<void>;
  insertOutput(row: OutputRow): Promise<void>;
  getOutput(id: string): Promise<OutputRow | null>;
  outputsForLender(lenderId: string): Promise<OutputRow[]>;
  insertRefusal(row: RefusalRow): Promise<void>;
  openRefusals(subscriberId: string): Promise<number>;
  subscribersNeedingReview(threshold: number): Promise<Array<{ subscriber_id: string; refusals: number }>>;
  clearRefusals(subscriberId: string, at: number): Promise<void>;
  insertReport(row: ReportRow): Promise<void>;
  openReports(): Promise<ReportRow[]>;
}

export interface BlobStore {
  put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream | null; httpMetadata?: { contentType?: string } } | null>;
  delete(keys: string | string[]): Promise<void>;
}

export type BankDeps = {
  store: BankStore | null;
  blobs: BlobStore | null;
  now?: () => number;
  adminSecret?: string;
  signingKey?: string;
  /** "on" lists pending (not yet team-verified) items to twin testers, flagged verified:false. */
  testMode?: string;
  /** Server-to-server secret shared with the twin app backend (Starks). Links real twin accounts. */
  twinAppSecret?: string;
};

type Json = Record<string, unknown>;
const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export function isPersonaBankPath(pathname: string): boolean {
  return /\/(persona-deposits|persona-bank|twin-bank)(\/|$)/.test(pathname);
}

/* ---------------- crypto helpers ---------------- */

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signMedia(key: string, payload: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(payload))));
}

const MEDIA_TTL_MS = 10 * 60_000;

/* ---------------- deposit parsing ---------------- */

export type DepositMeta = {
  id: string;
  pseudonym: string;
  country: string;
  offer: { voice: boolean; image: boolean };
  consent: { version: string; acceptedAt: number; terms: boolean; adult: boolean; noIncomeGuarantee: boolean; selfOnly: boolean };
  livenessCode: string;
};

export type DepositIssue =
  | "bad_meta"
  | "bad_id"
  | "consent_missing"
  | "consent_version"
  | "not_adult"
  | "no_offer"
  | "bad_pseudonym"
  | "bad_country"
  | "bad_liveness_code";

export function parseDepositMeta(raw: unknown): { ok: true; meta: DepositMeta } | { ok: false; issue: DepositIssue } {
  if (!raw || typeof raw !== "object") return { ok: false, issue: "bad_meta" };
  const r = raw as Json;
  if (!isPersonaId(r.id)) return { ok: false, issue: "bad_id" };
  const c = (r.consent && typeof r.consent === "object" ? r.consent : {}) as Json;
  if (c.adult !== true) return { ok: false, issue: "not_adult" };
  if (c.terms !== true || c.noIncomeGuarantee !== true || c.selfOnly !== true) return { ok: false, issue: "consent_missing" };
  if (c.version !== TWIN_BANK_CONSENT_VERSION) return { ok: false, issue: "consent_version" };
  const o = (r.offer && typeof r.offer === "object" ? r.offer : {}) as Json;
  const offer = { voice: o.voice === true, image: o.image === true };
  if (!offer.voice && !offer.image) return { ok: false, issue: "no_offer" };
  const pseudonym = cleanPseudonym(r.pseudonym);
  if (!pseudonym) return { ok: false, issue: "bad_pseudonym" };
  const country = cleanCountry(r.country);
  if (!country) return { ok: false, issue: "bad_country" };
  if (!isLivenessCode(r.livenessCode)) return { ok: false, issue: "bad_liveness_code" };
  const acceptedAt = typeof c.acceptedAt === "number" && c.acceptedAt > 0 ? c.acceptedAt : 0;
  if (!acceptedAt) return { ok: false, issue: "consent_missing" };
  return {
    ok: true,
    meta: {
      id: r.id as string,
      pseudonym,
      country,
      offer,
      consent: { version: TWIN_BANK_CONSENT_VERSION, acceptedAt, terms: true, adult: true, noIncomeGuarantee: true, selfOnly: true },
      livenessCode: r.livenessCode as string,
    },
  };
}

/* ---------------- handlers ---------------- */

function bearer(request: Request): string {
  const h = request.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

function isAdmin(request: Request, deps: BankDeps): boolean {
  return Boolean(deps.adminSecret) && safeEqual(bearer(request), deps.adminSecret as string);
}

async function readJson(request: Request): Promise<Json | null> {
  try {
    const text = await request.text();
    if (text.length > 4_000) return null;
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" ? (value as Json) : null;
  } catch {
    return null;
  }
}

function publicItem(row: LenderRow, kinds: TwinBankKind[]) {
  return {
    id: row.id,
    pseudonym: row.pseudonym,
    country: row.country,
    kinds,
    verified: row.status === "approved",
  };
}

async function availableKinds(store: BankStore, row: LenderRow): Promise<TwinBankKind[]> {
  const live = (await store.samples(row.id)).filter((s) => s.deleted_at == null).map((s) => s.asset);
  const kinds: TwinBankKind[] = [];
  if (row.offer_voice && live.includes("voice")) kinds.push("voice");
  if (row.offer_image && live.includes("image")) kinds.push("image");
  return kinds;
}

function listableStatuses(deps: BankDeps): LenderStatus[] {
  return deps.testMode === "on" ? ["approved", "pending_review"] : ["approved"];
}

function isTwinApp(request: Request, deps: BankDeps): boolean {
  return Boolean(deps.twinAppSecret) && safeEqual(bearer(request), deps.twinAppSecret as string);
}

export async function linkedSubscriberId(secret: string, twinAccountId: string): Promise<string> {
  const sig = await signMedia(secret, `twin-account.${twinAccountId}`);
  return `sub-${(await sha256Hex(sig)).slice(0, 32)}`;
}

type SubscriberCheck = { ok: true; linked: boolean } | { ok: false; res: Response };

/**
 * Who may use the bank:
 *  - a LINKED twin account (call from the twin backend with Bearer TWIN_APP_SECRET),
 *    paid tier (Créateur / Pro), not suspended;
 *  - in TEST MODE only, an unlinked test id (sub-…) from the browser.
 * A linked id can never be used from a browser without the app secret.
 */
async function checkSubscriber(request: Request, deps: BankDeps, store: BankStore, subscriberId: string): Promise<SubscriberCheck> {
  const linked = await store.getSubscriber(subscriberId);
  if (isTwinApp(request, deps)) {
    if (!linked) return { ok: false, res: jsonResponse({ error: "subscriber_not_linked" }, 404) };
    if (linked.suspended_at != null) return { ok: false, res: jsonResponse({ error: "subscriber_suspended" }, 423) };
    if (!TWIN_BANK_TIERS.includes(linked.tier as TwinTier)) return { ok: false, res: jsonResponse({ error: "tier_required", tiers: TWIN_BANK_TIERS }, 402) };
    return { ok: true, linked: true };
  }
  if (linked && linked.tier !== "test") return { ok: false, res: jsonResponse({ error: "app_auth_required" }, 401) };
  if (deps.testMode !== "on") return { ok: false, res: jsonResponse({ error: "app_auth_required" }, 401) };
  if (linked?.suspended_at != null) return { ok: false, res: jsonResponse({ error: "subscriber_suspended" }, 423) };
  return { ok: true, linked: false };
}

async function suspendSubscriber(store: BankStore, subscriberId: string, at: number | null): Promise<void> {
  const row = await store.getSubscriber(subscriberId);
  if (row) {
    await store.setSubscriberSuspended(subscriberId, at);
    return;
  }
  if (at == null) return;
  await store.upsertSubscriber({
    subscriber_id: subscriberId, account_hash: `test:${subscriberId}`, tier: "test", linked_at: at, updated_at: at, suspended_at: at,
  });
}

function promptSummary(prompt: string): string {
  const flat = prompt.replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  return flat.length > 140 ? `${flat.slice(0, 139)}…` : flat;
}

function cleanUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 500) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function newId(prefix: string): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return `${prefix}-${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Per-lender pseudonym of a subscriber: the lender sees « abonné-1a2b3c », never the account. */
async function subscriberAlias(subscriberId: string, lenderId: string): Promise<string> {
  return `abonne-${(await sha256Hex(`${lenderId}.${subscriberId}`)).slice(0, 6)}`;
}

export async function handlePersonaBank(request: Request, deps: BankDeps): Promise<Response> {
  const { store, blobs } = deps;
  if (!store || !blobs) return jsonResponse({ error: "storage_not_configured" }, 503);
  const now = deps.now ? deps.now() : Date.now();
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");

  /* ---- lender: deposit ---- */
  if (path.endsWith("/persona-deposits")) {
    if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
    const declared = Number(request.headers.get("Content-Length") || 0);
    if (declared > TWIN_BANK_MAX_TOTAL_BYTES) return jsonResponse({ error: "payload_too_large" }, 413);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonResponse({ error: "bad_request" }, 400);
    }
    let metaRaw: unknown = null;
    try {
      metaRaw = JSON.parse(String(form.get("meta") ?? ""));
    } catch {
      metaRaw = null;
    }
    const parsed = parseDepositMeta(metaRaw);
    if (!parsed.ok) return jsonResponse({ error: parsed.issue }, 400);
    const meta = parsed.meta;
    const files: Partial<Record<PersonaAsset, File>> = {};
    let total = 0;
    for (const asset of requiredMediaFor(meta.offer)) {
      const f = form.get(asset);
      if (!f || typeof f === "string") return jsonResponse({ error: "missing_media", asset }, 400);
      const file = f as File;
      if (!(file.size > 0)) return jsonResponse({ error: "missing_media", asset }, 400);
      if (file.size > TWIN_BANK_MAX_BYTES[asset]) return jsonResponse({ error: "media_too_large", asset }, 413);
      if (!MIME_OK[asset].test(file.type || "")) return jsonResponse({ error: "media_type", asset }, 415);
      total += file.size;
      files[asset] = file;
    }
    if (total > TWIN_BANK_MAX_TOTAL_BYTES) return jsonResponse({ error: "payload_too_large" }, 413);

    const token = randomToken();
    const row: LenderRow = {
      id: meta.id,
      pseudonym: meta.pseudonym,
      country: meta.country,
      offer_voice: meta.offer.voice ? 1 : 0,
      offer_image: meta.offer.image ? 1 : 0,
      consent_version: meta.consent.version,
      consent_at: meta.consent.acceptedAt,
      liveness_code: meta.livenessCode,
      status: "pending_review",
      withdraw_hash: await sha256Hex(token),
      created_at: now,
      reviewed_at: null,
      revoked_at: null,
    };
    if (!(await store.insertLender(row))) return jsonResponse({ error: "duplicate" }, 409);
    for (const asset of Object.keys(files) as PersonaAsset[]) {
      const file = files[asset] as File;
      const key = `persona/${meta.id}/${asset}`;
      await blobs.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
      await store.insertSample({ lender_id: meta.id, asset, r2_key: key, mime: file.type, size: file.size, created_at: now, deleted_at: null });
    }
    return jsonResponse({ ok: true, accepted: true, id: meta.id, status: row.status, withdrawToken: token });
  }

  /* ---- lender: status ---- */
  if (path.endsWith("/persona-deposits/status")) {
    if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
    const id = url.searchParams.get("id") || "";
    const token = url.searchParams.get("token") || "";
    const row = isPersonaId(id) ? await store.getLender(id) : null;
    if (!row || !token || !safeEqual(await sha256Hex(token), row.withdraw_hash)) return jsonResponse({ error: "not_found" }, 404);
    return jsonResponse({ ok: true, id, status: row.status });
  }

  /* ---- lender: usage log ---- */
  if (path.endsWith("/persona-deposits/usage")) {
    if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
    const id = url.searchParams.get("id") || "";
    const token = url.searchParams.get("token") || "";
    const row = isPersonaId(id) ? await store.getLender(id) : null;
    if (!row || !token || !safeEqual(await sha256Hex(token), row.withdraw_hash)) return jsonResponse({ error: "not_found" }, 404);
    const uses = await store.usageForLender(id);
    const outputs = await store.outputsForLender(id);
    return jsonResponse({
      ok: true,
      id,
      status: row.status,
      testMode: true,
      paid: false,
      uses: await Promise.all(uses.map(async (u) => ({
        at: u.created_at, month: u.month, kind: u.kind,
        subscriber: await subscriberAlias(u.subscriber_id, id),
        lenderCents: u.lender_cents, payoutAfter: u.payout_after, testMode: u.test_mode === 1,
      }))),
      outputs: await Promise.all(outputs.map(async (o) => ({
        at: o.created_at, kind: o.kind, outputId: o.id, summary: o.prompt_summary,
        subscriber: await subscriberAlias(o.subscriber_id, id), publishedUrl: o.published_url,
      }))),
      totals: {
        uses: uses.length,
        outputs: outputs.length,
        lenderCentsAccrued: uses.reduce((t, u) => t + u.lender_cents, 0),
      },
    });
  }

  /* ---- lender: withdraw (real deletion) ---- */
  if (path.endsWith("/persona-deposits/withdraw")) {
    if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
    const body = await readJson(request);
    const id = body?.id;
    const token = typeof body?.token === "string" ? body.token : "";
    const row = isPersonaId(id) ? await store.getLender(id) : null;
    if (!row || !token || !safeEqual(await sha256Hex(token), row.withdraw_hash)) return jsonResponse({ error: "not_found" }, 404);
    const live = (await store.samples(row.id)).filter((s) => s.deleted_at == null);
    if (live.length) await blobs.delete(live.map((s) => s.r2_key));
    await store.markSamplesDeleted(row.id, now);
    await store.updateLender(row.id, { status: "revoked", revoked_at: now, liveness_code: null });
    return jsonResponse({ ok: true, id: row.id, status: "revoked", deleted: live.length });
  }

  /* ---- team review ---- */
  if (path.endsWith("/persona-bank/review/media")) {
    if (!isAdmin(request, deps)) return jsonResponse({ error: "unauthorized" }, 401);
    const id = url.searchParams.get("id") || "";
    const asset = url.searchParams.get("asset") as PersonaAsset;
    if (!isPersonaId(id) || !ASSETS.includes(asset)) return jsonResponse({ error: "bad_request" }, 400);
    return streamAsset(store, blobs, id, asset);
  }
  if (path.endsWith("/persona-bank/review")) {
    if (!isAdmin(request, deps)) return jsonResponse({ error: "unauthorized" }, 401);
    if (request.method === "GET") {
      const rows = await store.listLenders(["pending_review"]);
      return jsonResponse({
        ok: true,
        pending: rows.map((r) => ({
          id: r.id, pseudonym: r.pseudonym, country: r.country,
          offer: { voice: !!r.offer_voice, image: !!r.offer_image },
          livenessCode: r.liveness_code, consentVersion: r.consent_version, createdAt: r.created_at,
        })),
        reports: (await store.openReports()).map((r) => ({
          id: r.id, outputId: r.output_id, itemId: r.lender_id, subscriberId: r.subscriber_id, reason: r.reason, createdAt: r.created_at,
        })),
        subscribersToReview: await store.subscribersNeedingReview(TWIN_REFUSALS_BEFORE_REVIEW),
      });
    }
    if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
    const body = await readJson(request);
    const id = body?.id;
    const decision = body?.decision;
    if (decision === "suspend-subscriber" || decision === "clear-subscriber") {
      const sub = body?.subscriberId;
      if (!isSubscriberId(sub)) return jsonResponse({ error: "bad_request" }, 400);
      if (decision === "suspend-subscriber") await suspendSubscriber(store, sub, now);
      else {
        await store.clearRefusals(sub, now);
        await suspendSubscriber(store, sub, null);
      }
      return jsonResponse({ ok: true, subscriberId: sub, decision });
    }
    if (!isPersonaId(id) || (decision !== "approve" && decision !== "reject")) return jsonResponse({ error: "bad_request" }, 400);
    const row = await store.getLender(id);
    if (!row || row.status === "revoked") return jsonResponse({ error: "not_found" }, 404);
    await store.updateLender(id, { status: decision === "approve" ? "approved" : "rejected", reviewed_at: now });
    return jsonResponse({ ok: true, id, status: decision === "approve" ? "approved" : "rejected" });
  }

  /* ---- twin: browse ---- */
  if (path.endsWith("/twin-bank")) {
    if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
    const rows = await store.listLenders(listableStatuses(deps));
    const items = [];
    for (const row of rows) {
      if (row.revoked_at != null) continue;
      const kinds = await availableKinds(store, row);
      if (kinds.length) items.push(publicItem(row, kinds));
    }
    return jsonResponse({
      ok: true,
      items,
      pricing: { perItemPerMonthCadCents: TWIN_BANK_PRICE_CAD_CENTS, beforeTaxes: true, liveBilling: TWIN_BANK_LIVE_BILLING, testMode: true },
    });
  }

  /* ---- twin: record a use (test mode) ---- */
  if (path.endsWith("/twin-bank/use")) {
    if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
    const body = await readJson(request);
    if (!body) return jsonResponse({ error: "bad_request" }, 400);
    const { subscriberId, itemId, kind } = body;
    if (!isSubscriberId(subscriberId) || !isPersonaId(itemId) || !isTwinBankKind(kind)) return jsonResponse({ error: "bad_request" }, 400);
    if (body.acceptCost !== true || body.acceptRules !== true) return jsonResponse({ error: "notice_not_accepted" }, 400);
    const who = await checkSubscriber(request, deps, store, subscriberId);
    if (!who.ok) return who.res;
    if ((await store.openRefusals(subscriberId)) >= TWIN_REFUSALS_BEFORE_REVIEW) return jsonResponse({ error: "human_review_required" }, 423);
    const row = await store.getLender(itemId);
    if (!row || row.revoked_at != null || !listableStatuses(deps).includes(row.status)) return jsonResponse({ error: "not_available" }, 404);
    if (!(await availableKinds(store, row)).includes(kind)) return jsonResponse({ error: "not_available" }, 404);
    const month = twinBankMonth(now);
    const split = twinBankSplit(TWIN_BANK_PRICE_CAD_CENTS);
    const inserted = await store.insertUsage({
      subscriber_id: subscriberId, lender_id: itemId, kind, month,
      amount_cad_cents: split.total, lender_cents: split.lender, opc_cents: split.opc, platform_cents: split.platform,
      payout_after: twinBankPayoutAfter(month), test_mode: 1, created_at: now,
    });
    const usage = await store.usageFor(subscriberId, month);
    let media: Json | null = null;
    if (deps.signingKey) {
      const exp = now + MEDIA_TTL_MS;
      const assets: PersonaAsset[] = kind === "voice" ? ["voice"] : ["image", "video"];
      media = {};
      for (const asset of assets) {
        const sig = await signMedia(deps.signingKey, `${itemId}.${asset}.${subscriberId}.${exp}`);
        media[asset] = `/twin-bank/media?item=${encodeURIComponent(itemId)}&asset=${asset}&sub=${encodeURIComponent(subscriberId)}&exp=${exp}&sig=${sig}`;
      }
    }
    return jsonResponse({
      ok: true,
      testMode: true,
      charged: false,
      linked: who.linked,
      alreadyCountedThisMonth: !inserted,
      month,
      monthTotalCadCents: usage.reduce((s, u) => s + u.amount_cad_cents, 0),
      lines: usage.length,
      media,
    });
  }

  /* ---- twin: monthly usage ---- */
  if (path.endsWith("/twin-bank/usage")) {
    if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
    const sub = url.searchParams.get("subscriberId");
    if (!isSubscriberId(sub)) return jsonResponse({ error: "bad_request" }, 400);
    const month = twinBankMonth(now);
    const usage = await store.usageFor(sub, month);
    return jsonResponse({
      ok: true,
      testMode: true,
      month,
      lines: usage.map((u) => ({ itemId: u.lender_id, kind: u.kind, amountCadCents: u.amount_cad_cents })),
      totalCadCents: usage.reduce((s, u) => s + u.amount_cad_cents, 0),
    });
  }

  /* ---- twin app: link a real twin account (server to server) ---- */
  if (path.endsWith("/twin-bank/subscribers")) {
    if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
    if (!deps.twinAppSecret) return jsonResponse({ error: "not_configured" }, 503);
    if (!isTwinApp(request, deps)) return jsonResponse({ error: "unauthorized" }, 401);
    const body = await readJson(request);
    const account = typeof body?.twinAccountId === "string" ? body.twinAccountId.trim() : "";
    const tier = body?.tier as TwinTier;
    if (account.length < 3 || account.length > 128 || !TWIN_TIERS.includes(tier)) return jsonResponse({ error: "bad_request" }, 400);
    const subscriberId = await linkedSubscriberId(deps.twinAppSecret, account);
    const existing = await store.getSubscriber(subscriberId);
    if (existing && existing.tier === "test") return jsonResponse({ error: "conflict" }, 409);
    await store.upsertSubscriber({
      subscriber_id: subscriberId,
      account_hash: await sha256Hex(account),
      tier,
      linked_at: existing?.linked_at ?? now,
      updated_at: now,
      suspended_at: existing?.suspended_at ?? null,
    });
    return jsonResponse({
      ok: true,
      subscriberId,
      tier,
      bankAccess: TWIN_BANK_TIERS.includes(tier) && existing?.suspended_at == null,
      suspended: existing?.suspended_at != null,
    });
  }

  /* ---- twin: check a prompt, log the output, get the « généré par IA » label ---- */
  if (path.endsWith("/twin-bank/generate")) {
    if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
    if (!deps.signingKey) return jsonResponse({ error: "not_configured" }, 503);
    const body = await readJson(request);
    if (!body) return jsonResponse({ error: "bad_request" }, 400);
    const { subscriberId, itemId, kind } = body;
    if (!isSubscriberId(subscriberId) || !isPersonaId(itemId) || !isTwinBankKind(kind)) return jsonResponse({ error: "bad_request" }, 400);
    const who = await checkSubscriber(request, deps, store, subscriberId);
    if (!who.ok) return who.res;
    if ((await store.openRefusals(subscriberId)) >= TWIN_REFUSALS_BEFORE_REVIEW) return jsonResponse({ error: "human_review_required" }, 423);
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 4000) : "";
    const promptHash = await sha256Hex(prompt);
    const issue = twinPromptIssue(prompt);
    if (issue) {
      if (issue !== "empty") {
        await store.insertRefusal({ subscriber_id: subscriberId, lender_id: itemId, reason: issue, prompt_sha256: promptHash, created_at: now, reviewed_at: null });
      }
      const refusals = await store.openRefusals(subscriberId);
      return jsonResponse({ error: issue === "empty" ? "prompt_required" : "banned_use", reason: issue, refusals, humanReview: refusals >= TWIN_REFUSALS_BEFORE_REVIEW }, 422);
    }
    const row = await store.getLender(itemId);
    if (!row || row.revoked_at != null || !listableStatuses(deps).includes(row.status)) return jsonResponse({ error: "not_available" }, 404);
    const month = twinBankMonth(now);
    const used = (await store.usageFor(subscriberId, month)).some((u) => u.lender_id === itemId && u.kind === kind);
    if (!used) return jsonResponse({ error: "use_required" }, 402);
    const outputSha = typeof body.outputSha256 === "string" && /^[a-f0-9]{64}$/.test(body.outputSha256) ? body.outputSha256 : null;
    const outputId = newId("out");
    const lenderRef = `pr-${(await sha256Hex(`lender.${itemId}`)).slice(0, 12)}`;
    const provenance = twinProvenance({ outputId, licenseId: `${itemId}.${kind}.${month}`, lenderRef, kind, outputSha256: outputSha, createdAt: now });
    const provenanceJson = JSON.stringify(provenance);
    const signature = await signMedia(deps.signingKey, provenanceJson);
    await store.insertOutput({
      id: outputId, subscriber_id: subscriberId, lender_id: itemId, kind,
      prompt_sha256: promptHash, prompt_summary: promptSummary(prompt), output_sha256: outputSha,
      published_url: cleanUrl(body.publishedUrl), provenance_json: provenanceJson, signature, created_at: now,
    });
    return jsonResponse({
      ok: true,
      outputId,
      aiGenerated: true,
      label: { visible: twinVisibleLabel(row.pseudonym, kind), audibleIntro: twinAudibleIntro(kind), mustDisplay: true },
      youtube: { syntheticContent: true },
      provenance,
      signature,
      verifyUrl: `/twin-bank/provenance?id=${outputId}`,
    });
  }

  /* ---- public: verify an output label ---- */
  if (path.endsWith("/twin-bank/provenance")) {
    if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
    const id = url.searchParams.get("id") || "";
    const out = /^out-[a-f0-9]{20}$/.test(id) ? await store.getOutput(id) : null;
    if (!out) return jsonResponse({ error: "not_found" }, 404);
    const valid = deps.signingKey ? safeEqual(await signMedia(deps.signingKey, out.provenance_json), out.signature) : false;
    const lender = await store.getLender(out.lender_id);
    return jsonResponse({
      ok: true,
      outputId: out.id,
      aiGenerated: true,
      kind: out.kind,
      createdAt: out.created_at,
      lenderWithdrawn: !lender || lender.revoked_at != null,
      signatureValid: valid,
      provenance: JSON.parse(out.provenance_json),
    });
  }

  /* ---- anyone: « Signaler un abus » ---- */
  if (path.endsWith("/twin-bank/report")) {
    if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
    const body = await readJson(request);
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    const outputId = typeof body?.outputId === "string" && /^out-[a-f0-9]{20}$/.test(body.outputId) ? body.outputId : null;
    const itemId = isPersonaId(body?.itemId) ? (body?.itemId as string) : null;
    if (reason.length < 3 || (!outputId && !itemId)) return jsonResponse({ error: "bad_request" }, 400);
    const out = outputId ? await store.getOutput(outputId) : null;
    if (outputId && !out) return jsonResponse({ error: "not_found" }, 404);
    await store.insertReport({
      id: newId("rep"), output_id: outputId, lender_id: out?.lender_id ?? itemId, subscriber_id: out?.subscriber_id ?? null,
      reason, created_at: now, closed_at: null,
    });
    // Cahier § 7.7: the output's subscriber is suspended at once, pending human review (24 h).
    if (out) await suspendSubscriber(store, out.subscriber_id, now);
    return jsonResponse({ ok: true, received: true, suspendedPendingReview: Boolean(out) }, 202);
  }

  /* ---- twin: signed media ---- */
  if (path.endsWith("/twin-bank/media")) {
    if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
    if (!deps.signingKey) return jsonResponse({ error: "not_configured" }, 503);
    const item = url.searchParams.get("item") || "";
    const asset = url.searchParams.get("asset") as PersonaAsset;
    const sub = url.searchParams.get("sub") || "";
    const exp = Number(url.searchParams.get("exp") || 0);
    const sig = url.searchParams.get("sig") || "";
    if (!isPersonaId(item) || !["voice", "image", "video"].includes(asset) || !isSubscriberId(sub) || !(exp > now)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }
    const expected = await signMedia(deps.signingKey, `${item}.${asset}.${sub}.${exp}`);
    if (!safeEqual(sig, expected)) return jsonResponse({ error: "forbidden" }, 403);
    const row = await store.getLender(item);
    if (!row || row.revoked_at != null) return jsonResponse({ error: "not_found" }, 404);
    return streamAsset(store, blobs, item, asset);
  }

  return jsonResponse({ error: "not_found" }, 404);
}

async function streamAsset(store: BankStore, blobs: BlobStore, id: string, asset: PersonaAsset): Promise<Response> {
  const sample = (await store.samples(id)).find((s) => s.asset === asset && s.deleted_at == null);
  if (!sample) return jsonResponse({ error: "not_found" }, 404);
  const obj = await blobs.get(sample.r2_key);
  if (!obj || !obj.body) return jsonResponse({ error: "not_found" }, 404);
  return new Response(obj.body, {
    status: 200,
    headers: { "Content-Type": sample.mime || "application/octet-stream", "Cache-Control": "private, no-store" },
  });
}

/* ---------------- D1 implementation ---------------- */

type D1Stmt = {
  bind: (...args: unknown[]) => {
    run: () => Promise<unknown>;
    first: <T = unknown>() => Promise<T | null>;
    all: <T = unknown>() => Promise<{ results?: T[] }>;
  };
};
export type D1ForBank = { prepare: (q: string) => D1Stmt };

export function d1BankStore(db: D1ForBank): BankStore {
  return {
    async insertLender(r) {
      try {
        await db
          .prepare(
            `INSERT INTO persona_lenders (id, pseudonym, country, offer_voice, offer_image, consent_version, consent_at,
             liveness_code, status, withdraw_hash, created_at, reviewed_at, revoked_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          )
          .bind(r.id, r.pseudonym, r.country, r.offer_voice, r.offer_image, r.consent_version, r.consent_at,
            r.liveness_code, r.status, r.withdraw_hash, r.created_at, r.reviewed_at, r.revoked_at)
          .run();
        return true;
      } catch {
        return false;
      }
    },
    async getLender(id) {
      return db.prepare(`SELECT * FROM persona_lenders WHERE id = ?`).bind(id).first<LenderRow>();
    },
    async updateLender(id, patch) {
      const keys = Object.keys(patch).filter((k) => ["status", "reviewed_at", "revoked_at", "liveness_code"].includes(k));
      if (!keys.length) return;
      await db
        .prepare(`UPDATE persona_lenders SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`)
        .bind(...keys.map((k) => (patch as Record<string, unknown>)[k] ?? null), id)
        .run();
    },
    async listLenders(statuses) {
      const marks = statuses.map(() => "?").join(",");
      const res = await db
        .prepare(`SELECT * FROM persona_lenders WHERE status IN (${marks}) AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 200`)
        .bind(...statuses)
        .all<LenderRow>();
      return res.results ?? [];
    },
    async insertSample(s) {
      await db
        .prepare(`INSERT INTO persona_samples (lender_id, asset, r2_key, mime, size, created_at, deleted_at) VALUES (?,?,?,?,?,?,?)`)
        .bind(s.lender_id, s.asset, s.r2_key, s.mime, s.size, s.created_at, s.deleted_at)
        .run();
    },
    async samples(lenderId) {
      const res = await db.prepare(`SELECT * FROM persona_samples WHERE lender_id = ?`).bind(lenderId).all<SampleRow>();
      return res.results ?? [];
    },
    async markSamplesDeleted(lenderId, at) {
      await db.prepare(`UPDATE persona_samples SET deleted_at = ? WHERE lender_id = ? AND deleted_at IS NULL`).bind(at, lenderId).run();
    },
    async insertUsage(u) {
      try {
        await db
          .prepare(
            `INSERT INTO twin_bank_usage (subscriber_id, lender_id, kind, month, amount_cad_cents, lender_cents, opc_cents,
             platform_cents, payout_after, test_mode, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          )
          .bind(u.subscriber_id, u.lender_id, u.kind, u.month, u.amount_cad_cents, u.lender_cents, u.opc_cents,
            u.platform_cents, u.payout_after, u.test_mode, u.created_at)
          .run();
        return true;
      } catch {
        return false; // UNIQUE (subscriber_id, lender_id, kind, month)
      }
    },
    async usageForLender(lenderId) {
      const res = await db
        .prepare(`SELECT * FROM twin_bank_usage WHERE lender_id = ? ORDER BY created_at DESC LIMIT 500`)
        .bind(lenderId)
        .all<UsageRow>();
      return res.results ?? [];
    },
    async getSubscriber(id) {
      return db.prepare(`SELECT * FROM twin_subscribers WHERE subscriber_id = ?`).bind(id).first<SubscriberRow>();
    },
    async upsertSubscriber(r) {
      await db
        .prepare(
          `INSERT INTO twin_subscribers (subscriber_id, account_hash, tier, linked_at, updated_at, suspended_at) VALUES (?,?,?,?,?,?)
           ON CONFLICT(subscriber_id) DO UPDATE SET tier = excluded.tier, updated_at = excluded.updated_at`,
        )
        .bind(r.subscriber_id, r.account_hash, r.tier, r.linked_at, r.updated_at, r.suspended_at)
        .run();
    },
    async setSubscriberSuspended(id, at) {
      await db.prepare(`UPDATE twin_subscribers SET suspended_at = ? WHERE subscriber_id = ?`).bind(at, id).run();
    },
    async insertOutput(o) {
      await db
        .prepare(
          `INSERT INTO twin_outputs (id, subscriber_id, lender_id, kind, prompt_sha256, prompt_summary, output_sha256, published_url,
           provenance_json, signature, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(o.id, o.subscriber_id, o.lender_id, o.kind, o.prompt_sha256, o.prompt_summary, o.output_sha256, o.published_url,
          o.provenance_json, o.signature, o.created_at)
        .run();
    },
    async getOutput(id) {
      return db.prepare(`SELECT * FROM twin_outputs WHERE id = ?`).bind(id).first<OutputRow>();
    },
    async outputsForLender(lenderId) {
      const res = await db
        .prepare(`SELECT * FROM twin_outputs WHERE lender_id = ? ORDER BY created_at DESC LIMIT 500`)
        .bind(lenderId)
        .all<OutputRow>();
      return res.results ?? [];
    },
    async insertRefusal(r) {
      await db
        .prepare(`INSERT INTO twin_prompt_refusals (subscriber_id, lender_id, reason, prompt_sha256, created_at, reviewed_at) VALUES (?,?,?,?,?,?)`)
        .bind(r.subscriber_id, r.lender_id, r.reason, r.prompt_sha256, r.created_at, r.reviewed_at)
        .run();
    },
    async openRefusals(subscriberId) {
      const row = await db
        .prepare(`SELECT COUNT(*) AS n FROM twin_prompt_refusals WHERE subscriber_id = ? AND reviewed_at IS NULL`)
        .bind(subscriberId)
        .first<{ n: number }>();
      return Number(row?.n ?? 0);
    },
    async subscribersNeedingReview(threshold) {
      const res = await db
        .prepare(
          `SELECT subscriber_id, COUNT(*) AS refusals FROM twin_prompt_refusals WHERE reviewed_at IS NULL
           GROUP BY subscriber_id HAVING COUNT(*) >= ? ORDER BY refusals DESC LIMIT 100`,
        )
        .bind(threshold)
        .all<{ subscriber_id: string; refusals: number }>();
      return res.results ?? [];
    },
    async clearRefusals(subscriberId, at) {
      await db.prepare(`UPDATE twin_prompt_refusals SET reviewed_at = ? WHERE subscriber_id = ? AND reviewed_at IS NULL`).bind(at, subscriberId).run();
    },
    async insertReport(r) {
      await db
        .prepare(`INSERT INTO twin_abuse_reports (id, output_id, lender_id, subscriber_id, reason, created_at, closed_at) VALUES (?,?,?,?,?,?,?)`)
        .bind(r.id, r.output_id, r.lender_id, r.subscriber_id, r.reason, r.created_at, r.closed_at)
        .run();
    },
    async openReports() {
      const res = await db.prepare(`SELECT * FROM twin_abuse_reports WHERE closed_at IS NULL ORDER BY created_at DESC LIMIT 200`).bind().all<ReportRow>();
      return res.results ?? [];
    },
    async usageFor(subscriberId, month) {
      const res = await db
        .prepare(`SELECT * FROM twin_bank_usage WHERE subscriber_id = ? AND month = ? ORDER BY created_at`)
        .bind(subscriberId, month)
        .all<UsageRow>();
      return res.results ?? [];
    },
  };
}

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
 *
 * Storage: R2 binding PERSONA_BANK (private bucket, never public) + D1 (migration 0016).
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
      });
    }
    if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
    const body = await readJson(request);
    const id = body?.id;
    const decision = body?.decision;
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
    async usageFor(subscriberId, month) {
      const res = await db
        .prepare(`SELECT * FROM twin_bank_usage WHERE subscriber_id = ? AND month = ? ORDER BY created_at`)
        .bind(subscriberId, month)
        .all<UsageRow>();
      return res.results ?? [];
    },
  };
}

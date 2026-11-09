/**
 * Twin-side client for the OPC image & voice bank (xsnow-chat Worker,
 * persona-bank.ts). TEST MODE: uses are recorded against a test subscriber
 * id kept on the device; nothing is ever charged (TWIN_BANK_LIVE_BILLING).
 * The real twin app (Starks) can call the same routes with its own
 * subscriber ids once twin subscriptions exist.
 */

import { durableGet, durableSet } from "./durable-storage.ts";
import { chatApiBase } from "./persona-deposit.ts";
import { isSubscriberId, type TwinBankKind } from "./twin-bank.ts";

export const TWIN_SUBSCRIBER_KEY = "xsnow.twinTestSubscriber";

export type TwinBankItem = {
  id: string;
  pseudonym: string;
  country: string;
  kinds: TwinBankKind[];
  verified: boolean;
};

export type TwinBankList =
  | { state: "ok"; items: TwinBankItem[]; priceCents: number }
  | { state: "not-configured" }
  | { state: "failed" };

export function newSubscriberId(random: () => number = Math.random): string {
  let out = "";
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 16; i += 1) out += abc[Math.floor(random() * abc.length) % abc.length];
  return `sub-${out}`;
}

export function testSubscriberId(): string {
  const stored = durableGet(TWIN_SUBSCRIBER_KEY);
  if (isSubscriberId(stored)) return stored;
  const fresh = newSubscriberId();
  durableSet(TWIN_SUBSCRIBER_KEY, fresh);
  return fresh;
}

function parseItem(raw: unknown): TwinBankItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.pseudonym !== "string") return null;
  const kinds = Array.isArray(r.kinds) ? r.kinds.filter((k): k is TwinBankKind => k === "voice" || k === "image") : [];
  if (!kinds.length) return null;
  return {
    id: r.id,
    pseudonym: r.pseudonym.slice(0, 40),
    country: typeof r.country === "string" ? r.country.slice(0, 40) : "",
    kinds,
    verified: r.verified === true,
  };
}

export async function fetchTwinBank(fetchImpl: typeof fetch = fetch, base?: string): Promise<TwinBankList> {
  try {
    const res = await fetchImpl(`${chatApiBase(base)}/twin-bank`, { credentials: "omit" });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.status === 503 && body?.error === "storage_not_configured") return { state: "not-configured" };
    if (!res.ok || !body || body.ok !== true || !Array.isArray(body.items)) return { state: "failed" };
    const pricing = (body.pricing ?? {}) as Record<string, unknown>;
    return {
      state: "ok",
      items: body.items.map(parseItem).filter((x): x is TwinBankItem => x != null),
      priceCents: typeof pricing.perItemPerMonthCadCents === "number" ? pricing.perItemPerMonthCadCents : 0,
    };
  } catch {
    return { state: "failed" };
  }
}

export type TwinUseResult =
  | { state: "recorded"; month: string; already: boolean; monthTotalCents: number; media: Record<string, string> }
  | { state: "failed" };

export async function recordTwinBankUse(
  input: { subscriberId: string; itemId: string; kind: TwinBankKind; acceptCost: boolean; acceptRules: boolean },
  fetchImpl: typeof fetch = fetch,
  base?: string,
): Promise<TwinUseResult> {
  if (!input.acceptCost || !input.acceptRules) return { state: "failed" };
  try {
    const res = await fetchImpl(`${chatApiBase(base)}/twin-bank/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "omit",
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !body || body.ok !== true || body.charged !== false) return { state: "failed" };
    const media: Record<string, string> = {};
    if (body.media && typeof body.media === "object") {
      for (const [k, v] of Object.entries(body.media as Record<string, unknown>)) {
        if (typeof v === "string" && v.startsWith("/twin-bank/media?")) media[k] = `${chatApiBase(base)}${v}`;
      }
    }
    return {
      state: "recorded",
      month: String(body.month ?? ""),
      already: body.alreadyCountedThisMonth === true,
      monthTotalCents: typeof body.monthTotalCadCents === "number" ? body.monthTotalCadCents : 0,
      media,
    };
  } catch {
    return { state: "failed" };
  }
}

export async function fetchTwinBankUsage(
  subscriberId: string,
  fetchImpl: typeof fetch = fetch,
  base?: string,
): Promise<{ count: number; totalCents: number; month: string } | null> {
  try {
    const res = await fetchImpl(`${chatApiBase(base)}/twin-bank/usage?subscriberId=${encodeURIComponent(subscriberId)}`, {
      credentials: "omit",
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !body || body.ok !== true) return null;
    return {
      count: Array.isArray(body.lines) ? body.lines.length : 0,
      totalCents: typeof body.totalCadCents === "number" ? body.totalCadCents : 0,
      month: String(body.month ?? ""),
    };
  } catch {
    return null;
  }
}

/* ---------- « généré par IA » label + banned-use filter (POST /twin-bank/generate) ---------- */

export type TwinLabel = {
  visible: { fr: string; en: string; es: string };
  audibleIntro: { fr: string; en: string; es: string };
};

export type TwinGenerateResult =
  | { state: "labelled"; outputId: string; label: TwinLabel; verifyUrl: string }
  | { state: "refused"; reason: string; refusals: number; humanReview: boolean }
  | { state: "needs-use" }
  | { state: "locked" }
  | { state: "failed" };

function trio(raw: unknown): { fr: string; en: string; es: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return typeof r.fr === "string" && typeof r.en === "string" && typeof r.es === "string" ? { fr: r.fr, en: r.en, es: r.es } : null;
}

export async function requestTwinOutputLabel(
  input: { subscriberId: string; itemId: string; kind: TwinBankKind; prompt: string; outputSha256?: string; publishedUrl?: string },
  fetchImpl: typeof fetch = fetch,
  base?: string,
): Promise<TwinGenerateResult> {
  try {
    const res = await fetchImpl(`${chatApiBase(base)}/twin-bank/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "omit",
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return { state: "failed" };
    if (res.status === 422) {
      return {
        state: "refused",
        reason: String(body.reason ?? "empty"),
        refusals: typeof body.refusals === "number" ? body.refusals : 0,
        humanReview: body.humanReview === true,
      };
    }
    if (res.status === 402 && body.error === "use_required") return { state: "needs-use" };
    if (res.status === 423) return { state: "locked" };
    const label = body.label as Record<string, unknown> | undefined;
    const visible = trio(label?.visible);
    const audibleIntro = trio(label?.audibleIntro);
    if (!res.ok || body.aiGenerated !== true || typeof body.outputId !== "string" || !visible || !audibleIntro) return { state: "failed" };
    const verify = typeof body.verifyUrl === "string" && body.verifyUrl.startsWith("/twin-bank/provenance?") ? `${chatApiBase(base)}${body.verifyUrl}` : "";
    return { state: "labelled", outputId: body.outputId, label: { visible, audibleIntro }, verifyUrl: verify };
  } catch {
    return { state: "failed" };
  }
}

export async function reportTwinAbuse(
  input: { outputId?: string; itemId?: string; reason: string },
  fetchImpl: typeof fetch = fetch,
  base?: string,
): Promise<"received" | "failed"> {
  try {
    const res = await fetchImpl(`${chatApiBase(base)}/twin-bank/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "omit",
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return res.status === 202 && body?.received === true ? "received" : "failed";
  } catch {
    return "failed";
  }
}

/* ---------- lender usage log (GET /persona-deposits/usage) ---------- */

export type LenderUsageLog = {
  uses: Array<{ at: number; month: string; kind: TwinBankKind; subscriber: string; lenderCents: number }>;
  outputs: Array<{ at: number; kind: TwinBankKind; subscriber: string; summary: string }>;
  totals: { uses: number; outputs: number; lenderCentsAccrued: number };
};

export async function fetchLenderUsageLog(
  dossier: { id: string; withdrawToken: string },
  fetchImpl: typeof fetch = fetch,
  base?: string,
): Promise<LenderUsageLog | null> {
  if (!dossier.withdrawToken) return null;
  try {
    const q = `id=${encodeURIComponent(dossier.id)}&token=${encodeURIComponent(dossier.withdrawToken)}`;
    const res = await fetchImpl(`${chatApiBase(base)}/persona-deposits/usage?${q}`, { credentials: "omit" });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !body || body.ok !== true || !Array.isArray(body.uses) || !Array.isArray(body.outputs)) return null;
    const kind = (k: unknown): TwinBankKind => (k === "image" ? "image" : "voice");
    const totals = (body.totals ?? {}) as Record<string, unknown>;
    return {
      uses: body.uses.map((u: Record<string, unknown>) => ({
        at: Number(u.at) || 0, month: String(u.month ?? ""), kind: kind(u.kind),
        subscriber: String(u.subscriber ?? "").slice(0, 20), lenderCents: Number(u.lenderCents) || 0,
      })),
      outputs: body.outputs.map((o: Record<string, unknown>) => ({
        at: Number(o.at) || 0, kind: kind(o.kind), subscriber: String(o.subscriber ?? "").slice(0, 20), summary: String(o.summary ?? "").slice(0, 160),
      })),
      totals: {
        uses: Number(totals.uses) || 0,
        outputs: Number(totals.outputs) || 0,
        lenderCentsAccrued: Number(totals.lenderCentsAccrued) || 0,
      },
    };
  } catch {
    return null;
  }
}

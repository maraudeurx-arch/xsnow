/**
 * Neighborhood news for Accueil — real headlines only (RSS / Worker).
 * Never invents stories. Safe pure helpers live here for Node tests;
 * browser fetch + cache live in the client helpers below.
 */

import { CHAT_API_URL } from "./llm.ts";
import { durableGet, durableSet } from "./durable-storage.ts";

export type NewsCategory = "digital_economy" | "local";

export type NeighborhoodNewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
  category: NewsCategory;
};

export type NeighborhoodNewsPayload = {
  city: string;
  fetchedAt: number;
  items: NeighborhoodNewsItem[];
};

export const NEWS_CACHE_PREFIX = "xsnow.neighborhoodNews.";
export const NEWS_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
export const NEWS_DISPLAY_LIMIT = 6;

export const NEWS_API_URL =
  process.env.NEXT_PUBLIC_NEWS_API_URL ||
  `${String(CHAT_API_URL).replace(/\/$/, "")}/news`;

/** Worker GET /news — keep short so a missing /news route (405) or hang cannot freeze Accueil. */
export const NEWS_WORKER_TIMEOUT_MS = 4_000;
/** rss2json CORS JSON fallback after the Worker miss. */
export const NEWS_FALLBACK_TIMEOUT_MS = 5_000;
export const NEWS_RSS_JSON_PROXY = "https://api.rss2json.com/v1/api.json";

export type NeighborhoodNewsFetchOptions = {
  city: string;
  locale: "fr" | "en" | "es";
  countryCode?: string;
  signal?: AbortSignal;
  workerTimeoutMs?: number;
  fallbackTimeoutMs?: number;
};

const DIGITAL_ECONOMY_RE =
  /(num[eé]rique|digital|\btech\b|technologies?|internet|cyber|start-?ups?|econom(?:ie|y)|\b[eé]conom(?:ie|ique|y)\b|business|commerces?|fintech|crypto|bitcoin|\bIA\b|\bAI\b|intelligence artificielle|artificial intelligence|software|logiciel|broadband|fibres?|\b5g\b|emploi tech|remote work|t[eé]l[eé]travail|e-?commerce|innovation)/iu;

export function normalizeCityKey(city: string): string {
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

export function newsCacheKey(city: string): string {
  return `${NEWS_CACHE_PREFIX}${normalizeCityKey(city) || "unknown"}`;
}

export function isDigitalEconomyHeadline(title: string): boolean {
  return DIGITAL_ECONOMY_RE.test(title);
}

export function categorizeHeadline(title: string): NewsCategory {
  return isDigitalEconomyHeadline(title) ? "digital_economy" : "local";
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function tagText(block: string, tag: string): string {
  const cdata = block.match(
    new RegExp(`<${tag}\\b[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i"),
  );
  if (cdata?.[1]) return decodeXmlEntities(cdata[1]);
  const plain = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return plain?.[1] ? decodeXmlEntities(plain[1]) : "";
}

function sourceFromItem(block: string, title: string): string {
  const sourced = tagText(block, "source");
  if (sourced) return sourced;
  const dash = title.match(/\s[-–—]\s([^–—-]{2,80})$/);
  return dash?.[1]?.trim() || "";
}

function stripSourceSuffix(title: string, source: string): string {
  if (!source) return title.trim();
  const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return title
    .replace(new RegExp(`\\s[-–—]\\s${escaped}\\s*$`, "i"), "")
    .trim();
}

export function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
}> {
  const items: Array<{
    title: string;
    link: string;
    source: string;
    publishedAt: string | null;
  }> = [];
  const chunks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (const chunk of chunks) {
    const rawTitle = tagText(chunk, "title");
    const link = tagText(chunk, "link");
    if (!rawTitle || !link) continue;
    if (!/^https?:\/\//i.test(link)) continue;
    const source = sourceFromItem(chunk, rawTitle);
    const title = stripSourceSuffix(rawTitle, source) || rawTitle;
    const pubDate = tagText(chunk, "pubDate");
    let publishedAt: string | null = null;
    if (pubDate) {
      const ms = Date.parse(pubDate);
      publishedAt = Number.isFinite(ms) ? new Date(ms).toISOString() : null;
    }
    items.push({ title, link, source: source || "Google News", publishedAt });
  }
  return items;
}

export function toNeighborhoodItem(
  raw: { title: string; link: string; source: string; publishedAt: string | null },
  forceCategory?: NewsCategory,
): NeighborhoodNewsItem {
  const title = raw.title.trim();
  const category = forceCategory ?? categorizeHeadline(title);
  const id = `${category}:${title.toLowerCase()}:${raw.link}`;
  return {
    id,
    title,
    link: raw.link.trim(),
    source: raw.source.trim() || "Google News",
    publishedAt: raw.publishedAt,
    category,
  };
}

/** Digital/economy first, then other local — stable within each bucket. */
export function orderNeighborhoodNews(
  items: NeighborhoodNewsItem[],
  limit = NEWS_DISPLAY_LIMIT,
): NeighborhoodNewsItem[] {
  const seen = new Set<string>();
  const digital: NeighborhoodNewsItem[] = [];
  const local: NeighborhoodNewsItem[] = [];

  for (const item of items) {
    const key = item.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (item.category === "digital_economy") digital.push(item);
    else local.push(item);
  }

  return [...digital, ...local].slice(0, limit);
}

export function mergeNewsBuckets(
  digitalRaw: Array<{ title: string; link: string; source: string; publishedAt: string | null }>,
  localRaw: Array<{ title: string; link: string; source: string; publishedAt: string | null }>,
  limit = NEWS_DISPLAY_LIMIT,
): NeighborhoodNewsItem[] {
  const digital = digitalRaw.map((item) => toNeighborhoodItem(item, "digital_economy"));
  const local = localRaw.map((item) => toNeighborhoodItem(item));
  return orderNeighborhoodNews([...digital, ...local], limit);
}

export function googleNewsSearchUrl(
  query: string,
  opts: { hl: string; gl: string; ceid: string },
): string {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", opts.hl);
  url.searchParams.set("gl", opts.gl);
  url.searchParams.set("ceid", opts.ceid);
  return url.toString();
}

export function newsLocaleParams(
  locale: "fr" | "en" | "es",
  countryCode?: string,
): { hl: string; gl: string; ceid: string } {
  const country = (countryCode || "CA").trim().toUpperCase() || "CA";
  if (locale === "en") {
    const gl = country === "US" ? "US" : country === "GB" ? "GB" : "CA";
    const hl = gl === "US" ? "en-US" : gl === "GB" ? "en-GB" : "en-CA";
    return { hl, gl, ceid: `${gl}:${hl.split("-")[0]}` };
  }
  if (locale === "es") {
    const gl = country === "MX" ? "MX" : country === "ES" ? "ES" : "US";
    const hl = gl === "ES" ? "es" : "es-419";
    return { hl, gl, ceid: gl === "ES" ? "ES:es" : `${gl}:es-419` };
  }
  const gl = country === "FR" ? "FR" : country === "BE" ? "BE" : "CA";
  const hl = gl === "FR" ? "fr" : gl === "BE" ? "fr" : "fr-CA";
  return { hl, gl, ceid: gl === "CA" ? "CA:fr" : `${gl}:fr` };
}

export function digitalEconomyQuery(city: string, locale: "fr" | "en" | "es"): string {
  const place = city.trim();
  if (locale === "en") {
    return `"${place}" (digital OR economy OR tech OR business OR "artificial intelligence") when:14d`;
  }
  if (locale === "es") {
    return `"${place}" (digital OR economía OR tecnología OR comercio OR "inteligencia artificial") when:14d`;
  }
  return `"${place}" (numérique OR économie OR tech OR technologie OR commerce OR "intelligence artificielle") when:14d`;
}

export function localNewsQuery(city: string): string {
  return `"${city.trim()}" when:14d`;
}

export function parseNewsPayload(value: unknown): NeighborhoodNewsPayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    city?: unknown;
    fetchedAt?: unknown;
    items?: unknown;
  };
  const city = typeof record.city === "string" ? record.city.trim() : "";
  const fetchedAt =
    typeof record.fetchedAt === "number" && Number.isFinite(record.fetchedAt)
      ? record.fetchedAt
      : NaN;
  if (!city || !Number.isFinite(fetchedAt) || !Array.isArray(record.items)) return null;

  const items: NeighborhoodNewsItem[] = [];
  for (const entry of record.items) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const link = typeof row.link === "string" ? row.link.trim() : "";
    const source = typeof row.source === "string" ? row.source.trim() : "";
    const category =
      row.category === "digital_economy" || row.category === "local"
        ? row.category
        : categorizeHeadline(title);
    const publishedAt =
      typeof row.publishedAt === "string" && row.publishedAt.trim()
        ? row.publishedAt.trim()
        : null;
    if (!title || !link || !/^https?:\/\//i.test(link)) continue;
    items.push({
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `${category}:${title.toLowerCase()}:${link}`,
      title,
      link,
      source: source || "Google News",
      publishedAt,
      category,
    });
  }

  return {
    city,
    fetchedAt,
    items: orderNeighborhoodNews(items),
  };
}

export function readCachedNews(city: string): NeighborhoodNewsPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = durableGet(newsCacheKey(city));
    if (!raw) return null;
    return parseNewsPayload(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeCachedNews(payload: NeighborhoodNewsPayload) {
  if (typeof window === "undefined") return;
  durableSet(newsCacheKey(payload.city), JSON.stringify(payload));
}

export function cacheIsFresh(payload: NeighborhoodNewsPayload, now = Date.now()): boolean {
  return now - payload.fetchedAt < NEWS_CACHE_MAX_AGE_MS;
}

export function isAbortError(caught: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      caught instanceof DOMException &&
      caught.name === "AbortError") ||
    (caught instanceof Error && caught.name === "AbortError")
  );
}

export function mergeAbortSignals(signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const live = signals.filter((signal): signal is AbortSignal => Boolean(signal));
  if (live.length === 0) return undefined;
  if (live.length === 1) return live[0];
  if (typeof AbortSignal.any === "function") return AbortSignal.any(live);
  const controller = new AbortController();
  for (const signal of live) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  parent?: AbortSignal,
): Promise<Response> {
  if (parent?.aborted) {
    throw parent.reason instanceof Error
      ? parent.reason
      : new DOMException("Aborted", "AbortError");
  }
  const timer = new AbortController();
  const id = setTimeout(() => timer.abort(), timeoutMs);
  const signal = mergeAbortSignals([parent, timer.signal]);
  try {
    return await fetch(url, { ...init, signal });
  } finally {
    clearTimeout(id);
  }
}

export function parseRss2JsonItems(value: unknown): Array<{
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
}> {
  if (!value || typeof value !== "object") return [];
  const record = value as { status?: unknown; items?: unknown };
  if (record.status === "error") return [];
  if (!Array.isArray(record.items)) return [];

  const items: Array<{
    title: string;
    link: string;
    source: string;
    publishedAt: string | null;
  }> = [];
  for (const entry of record.items) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const rawTitle = typeof row.title === "string" ? row.title.trim() : "";
    const link = typeof row.link === "string" ? row.link.trim() : "";
    if (!rawTitle || !link || !/^https?:\/\//i.test(link)) continue;
    const author = typeof row.author === "string" ? row.author.trim() : "";
    const source = author || sourceFromItem("", rawTitle);
    const title = stripSourceSuffix(rawTitle, source) || rawTitle;
    let publishedAt: string | null = null;
    if (typeof row.pubDate === "string" && row.pubDate.trim()) {
      const ms = Date.parse(row.pubDate.replace(" ", "T"));
      publishedAt = Number.isFinite(ms) ? new Date(ms).toISOString() : null;
    }
    items.push({ title, link, source: source || "Google News", publishedAt });
  }
  return items;
}

type RssFallbackResult = {
  items: Array<{ title: string; link: string; source: string; publishedAt: string | null }>;
  ok: boolean;
};

async function fetchRssItemsFallback(
  rssUrl: string,
  parent: AbortSignal | undefined,
  timeoutMs: number,
): Promise<RssFallbackResult> {
  try {
    const jsonUrl = `${NEWS_RSS_JSON_PROXY}?rss_url=${encodeURIComponent(rssUrl)}`;
    const response = await fetchWithTimeout(
      jsonUrl,
      { method: "GET", headers: { Accept: "application/json" } },
      timeoutMs,
      parent,
    );
    if (response.ok) {
      const payload = (await response.json()) as unknown;
      if (payload && typeof payload === "object" && (payload as { status?: unknown }).status === "ok") {
        return { items: parseRss2JsonItems(payload), ok: true };
      }
    }
  } catch (caught) {
    if (isAbortError(caught) && parent?.aborted) throw caught;
  }
  return { items: [], ok: false };
}

async function fetchNeighborhoodNewsViaRss(
  options: NeighborhoodNewsFetchOptions & { city: string },
): Promise<NeighborhoodNewsPayload & { ok: boolean }> {
  const timeoutMs = options.fallbackTimeoutMs ?? NEWS_FALLBACK_TIMEOUT_MS;
  const locale = newsLocaleParams(options.locale, options.countryCode);
  const digitalUrl = googleNewsSearchUrl(
    digitalEconomyQuery(options.city, options.locale),
    locale,
  );
  const localUrl = googleNewsSearchUrl(localNewsQuery(options.city), locale);
  const [digital, local] = await Promise.all([
    fetchRssItemsFallback(digitalUrl, options.signal, timeoutMs),
    fetchRssItemsFallback(localUrl, options.signal, timeoutMs),
  ]);
  return {
    city: options.city,
    fetchedAt: Date.now(),
    items: mergeNewsBuckets(digital.items, local.items),
    ok: digital.ok || local.ok,
  };
}

export async function fetchNeighborhoodNews(
  options: NeighborhoodNewsFetchOptions,
): Promise<NeighborhoodNewsPayload> {
  const city = options.city.trim();
  if (!city) {
    return { city: "", fetchedAt: Date.now(), items: [] };
  }

  const url = new URL(NEWS_API_URL);
  url.searchParams.set("city", city);
  url.searchParams.set("lang", options.locale);
  if (options.countryCode) url.searchParams.set("country", options.countryCode);

  try {
    const response = await fetchWithTimeout(
      url.toString(),
      { method: "GET", headers: { Accept: "application/json" } },
      options.workerTimeoutMs ?? NEWS_WORKER_TIMEOUT_MS,
      options.signal,
    );
    if (response.ok) {
      const payload = parseNewsPayload(await response.json());
      if (payload) return payload;
    }
  } catch (caught) {
    if (isAbortError(caught) && options.signal?.aborted) throw caught;
  }

  // Worker not redeployed (GET /news → 405) or hang/CORS — timed rss2json fallback.
  const viaRss = await fetchNeighborhoodNewsViaRss({ ...options, city });
  if (viaRss.items.length || viaRss.ok) {
    return { city: viaRss.city, fetchedAt: viaRss.fetchedAt, items: viaRss.items };
  }
  throw new Error("news_unavailable");
}

/** Headlines line for the avatar system prompt — real titles only. */
export function headlinesForPrompt(items: NeighborhoodNewsItem[], limit = 4): string {
  return items
    .slice(0, limit)
    .map((item, index) => `${index + 1}. ${item.title} (${item.source})`)
    .join(" ");
}

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

async function fetchRssText(rssUrl: string, signal?: AbortSignal): Promise<string> {
  // Direct fetch usually fails (no CORS on Google News). Try public read proxies.
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`,
  ];
  for (const proxy of proxies) {
    try {
      const response = await fetch(proxy, {
        method: "GET",
        headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" },
        signal,
      });
      if (!response.ok) continue;
      const text = await response.text();
      if (text.includes("<item")) return text;
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") throw caught;
    }
  }
  return "";
}

async function fetchNeighborhoodNewsViaRss(options: {
  city: string;
  locale: "fr" | "en" | "es";
  countryCode?: string;
  signal?: AbortSignal;
}): Promise<NeighborhoodNewsPayload> {
  const locale = newsLocaleParams(options.locale, options.countryCode);
  const digitalUrl = googleNewsSearchUrl(
    digitalEconomyQuery(options.city, options.locale),
    locale,
  );
  const localUrl = googleNewsSearchUrl(localNewsQuery(options.city), locale);
  const [digitalXml, localXml] = await Promise.all([
    fetchRssText(digitalUrl, options.signal),
    fetchRssText(localUrl, options.signal),
  ]);
  return {
    city: options.city,
    fetchedAt: Date.now(),
    items: mergeNewsBuckets(parseRssItems(digitalXml), parseRssItems(localXml)),
  };
}

export async function fetchNeighborhoodNews(options: {
  city: string;
  locale: "fr" | "en" | "es";
  countryCode?: string;
  signal?: AbortSignal;
}): Promise<NeighborhoodNewsPayload> {
  const city = options.city.trim();
  if (!city) {
    return { city: "", fetchedAt: Date.now(), items: [] };
  }

  const url = new URL(NEWS_API_URL);
  url.searchParams.set("city", city);
  url.searchParams.set("lang", options.locale);
  if (options.countryCode) url.searchParams.set("country", options.countryCode);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: options.signal,
    });
    if (response.ok) {
      const payload = parseNewsPayload(await response.json());
      if (payload) return payload;
    }
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") throw caught;
  }

  // Worker not redeployed yet, or CORS/network miss — try RSS via CORS-friendly proxies.
  const viaRss = await fetchNeighborhoodNewsViaRss({ ...options, city });
  if (viaRss.items.length) return viaRss;
  throw new Error("news_unavailable");
}

/** Headlines line for the avatar system prompt — real titles only. */
export function headlinesForPrompt(items: NeighborhoodNewsItem[], limit = 4): string {
  return items
    .slice(0, limit)
    .map((item, index) => `${index + 1}. ${item.title} (${item.source})`)
    .join(" ");
}

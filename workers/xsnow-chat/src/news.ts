/**
 * Public local-news proxy — Google News RSS only.
 * Returns attributed headlines; never invents stories.
 */

import {
  digitalEconomyQuery,
  googleNewsSearchUrl,
  localNewsQuery,
  mergeNewsBuckets,
  newsLocaleParams,
  parseRssItems,
  type NeighborhoodNewsItem,
} from "../../../src/lib/neighborhood-news.ts";

const MAX_CITY_CHARS = 80;
const FETCH_TIMEOUT_MS = 8_000;

export function parseCityParam(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_CITY_CHARS);
  if (!trimmed) return null;
  if (/[\u0000-\u001f<>]/.test(trimmed)) return null;
  return trimmed;
}

export function parseLangParam(value: unknown): "fr" | "en" | "es" {
  if (value === "en" || value === "es" || value === "fr") return value;
  return "fr";
}

async function fetchRss(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "OpenCommunityNews/1.0 (+https://opencommunity.app/)",
      },
    });
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCityNews(options: {
  city: string;
  lang: "fr" | "en" | "es";
  country?: string;
}): Promise<{ city: string; fetchedAt: number; items: NeighborhoodNewsItem[] }> {
  const locale = newsLocaleParams(options.lang, options.country);
  const digitalUrl = googleNewsSearchUrl(digitalEconomyQuery(options.city, options.lang), locale);
  const localUrl = googleNewsSearchUrl(localNewsQuery(options.city), locale);

  const [digitalXml, localXml] = await Promise.all([fetchRss(digitalUrl), fetchRss(localUrl)]);
  const items = mergeNewsBuckets(parseRssItems(digitalXml), parseRssItems(localXml));

  return {
    city: options.city,
    fetchedAt: Date.now(),
    items,
  };
}

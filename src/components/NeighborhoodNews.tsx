"use client";

import { useEffect, useState } from "react";
import { AccueilAdsReel } from "@/components/AccueilAdsReel";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";
import {
  cacheIsFresh,
  fetchNeighborhoodNews,
  headlinesForPrompt,
  readCachedNews,
  writeCachedNews,
  type NeighborhoodNewsItem,
  type NeighborhoodNewsPayload,
} from "@/lib/neighborhood-news";

export type NeighborhoodNewsState = {
  status: "hidden" | "need_city" | "loading" | "ready" | "empty" | "error";
  items: NeighborhoodNewsItem[];
  headlineLine: string;
};

type Props = {
  onNewsChange?: (state: NeighborhoodNewsState) => void;
};

export function NeighborhoodNews({ onNewsChange }: Props) {
  const { city, countryCode, resolved } = usePlace();
  const { locale, m } = useI18n();
  const copy = m.neighborhoodNews;
  const [status, setStatus] = useState<NeighborhoodNewsState["status"]>(
    resolved ? "loading" : "need_city",
  );
  const [items, setItems] = useState<NeighborhoodNewsItem[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;

    if (!resolved) {
      setStatus("need_city");
      setItems([]);
      setFromCache(false);
      onNewsChange?.({ status: "need_city", items: [], headlineLine: "" });
      return () => {
        alive = false;
      };
    }

    const cached = readCachedNews(city);
    if (cached?.items.length) {
      setItems(cached.items);
      setFromCache(true);
      setStatus("ready");
      onNewsChange?.({
        status: "ready",
        items: cached.items,
        headlineLine: headlinesForPrompt(cached.items),
      });
      if (cacheIsFresh(cached) && attempt === 0) {
        return () => {
          alive = false;
        };
      }
    } else {
      setStatus("loading");
      setItems([]);
      setFromCache(false);
      onNewsChange?.({ status: "loading", items: [], headlineLine: "" });
    }

    const controller = new AbortController();
    void fetchNeighborhoodNews({
      city,
      locale,
      countryCode: countryCode || undefined,
      signal: controller.signal,
    })
      .then((payload: NeighborhoodNewsPayload) => {
        if (!alive) return;
        writeCachedNews(payload);
        setItems(payload.items);
        setFromCache(false);
        const nextStatus = payload.items.length ? "ready" : "empty";
        setStatus(nextStatus);
        onNewsChange?.({
          status: nextStatus,
          items: payload.items,
          headlineLine: headlinesForPrompt(payload.items),
        });
      })
      .catch(() => {
        if (!alive) return;
        if (cached?.items.length) {
          setItems(cached.items);
          setFromCache(true);
          setStatus("ready");
          onNewsChange?.({
            status: "ready",
            items: cached.items,
            headlineLine: headlinesForPrompt(cached.items),
          });
          return;
        }
        setStatus("error");
        setItems([]);
        onNewsChange?.({ status: "error", items: [], headlineLine: "" });
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [attempt, city, countryCode, locale, onNewsChange, resolved]);

  return (
    <section
      data-neighborhood-news
      data-news-status={status}
      data-news-ads-only
      aria-label={copy.title}
      className="flex min-h-0 flex-1 grow flex-col self-stretch overflow-hidden rounded-xl border border-gold/30 bg-[rgba(8,8,12,0.92)] p-1 sm:min-h-[24rem]"
    >
      {/* Headlines stay off-screen: space is reserved for full-bleed ads. */}
      <div className="sr-only" aria-live="polite">
        {status === "ready" && items.length
          ? items.map((item) => item.title).join(". ")
          : copy.title}
      </div>
      <div data-news-body className="flex min-h-0 flex-1 grow flex-col overflow-hidden">
        <AccueilAdsReel />
      </div>
    </section>
  );
}

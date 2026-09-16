"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!resolved) {
      setStatus("need_city");
      setItems([]);
      setFromCache(false);
      onNewsChange?.({ status: "need_city", items: [], headlineLine: "" });
      return;
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
      if (cacheIsFresh(cached)) return;
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
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
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

    return () => controller.abort();
  }, [city, countryCode, locale, onNewsChange, resolved]);

  return (
    <section
      data-neighborhood-news
      data-news-status={status}
      aria-label={copy.title}
      className="flex shrink-0 flex-col gap-1 rounded-xl border border-gold/30 bg-[rgba(8,8,12,0.88)] px-2 py-1.5"
    >
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-[10px] font-extrabold tracking-wide text-gold">{copy.title}</h2>
        {fromCache && status === "ready" ? (
          <span className="text-[8px] font-semibold text-ice/60">{copy.cached}</span>
        ) : null}
      </div>

      {status === "need_city" ? (
        <p className="px-0.5 text-[10px] leading-snug text-snow/70" role="status">
          {copy.needCity}
        </p>
      ) : null}

      {status === "loading" ? (
        <p className="px-0.5 text-[10px] leading-snug text-ice/70" role="status">
          {copy.loading}
        </p>
      ) : null}

      {status === "empty" ? (
        <p className="px-0.5 text-[10px] leading-snug text-snow/70" role="status">
          {copy.empty}
        </p>
      ) : null}

      {status === "error" ? (
        <p className="px-0.5 text-[10px] leading-snug text-gold" role="status">
          {copy.error}
        </p>
      ) : null}

      {status === "ready" && items.length > 0 ? (
        <ul className="flex max-h-[min(28dvh,9.5rem)] flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 hover:border-gold/40 hover:bg-white/[0.07]"
              >
                <span className="block text-[11px] font-semibold leading-snug text-snow">
                  {item.title}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[8px] font-bold uppercase tracking-wide text-ice/65">
                  <span>
                    {item.category === "digital_economy" ? copy.badgeDigital : copy.badgeLocal}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{item.source}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

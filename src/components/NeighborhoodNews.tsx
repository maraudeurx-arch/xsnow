"use client";

import { useEffect, useState } from "react";
import { PartnerAdSlot } from "@/components/PartnerAdSlot";
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
import { visiblePartnerSlots, type PartnerSlotId } from "@/lib/partner-ads";

export type NeighborhoodNewsState = {
  status: "hidden" | "need_city" | "loading" | "ready" | "empty" | "error";
  items: NeighborhoodNewsItem[];
  headlineLine: string;
};

type Props = {
  onNewsChange?: (state: NeighborhoodNewsState) => void;
};

function hasSlot(slots: PartnerSlotId[], id: PartnerSlotId) {
  return slots.includes(id);
}

export function NeighborhoodNews({ onNewsChange }: Props) {
  const { city, countryCode, resolved } = usePlace();
  const { locale, m } = useI18n();
  const copy = m.neighborhoodNews;
  const slots = visiblePartnerSlots();
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

  const showMid = hasSlot(slots, "news-mid");
  const showBottom = hasSlot(slots, "news-bottom");

  return (
    <section
      data-neighborhood-news
      data-news-status={status}
      aria-label={copy.title}
      className="mt-[var(--home-stack-gap)] flex min-h-[15rem] flex-1 flex-col gap-1 overflow-hidden rounded-xl border border-gold/30 bg-[rgba(8,8,12,0.88)] px-2 py-1.5 sm:min-h-[16.5rem]"
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-[10px] font-extrabold tracking-wide text-gold">{copy.title}</h2>
        {fromCache && status === "ready" ? (
          <span className="text-[8px] font-semibold text-ice/60">{copy.cached}</span>
        ) : null}
      </div>

      {status === "need_city" ? (
        <p className="shrink-0 px-0.5 text-[10px] leading-snug text-snow/70" role="status">
          {copy.needCity}
        </p>
      ) : null}

      {status === "loading" ? (
        <p className="shrink-0 px-0.5 text-[10px] leading-snug text-ice/70" role="status">
          {copy.loading}
        </p>
      ) : null}

      {status === "empty" ? (
        <p className="shrink-0 px-0.5 text-[10px] leading-snug text-snow/70" role="status">
          {copy.empty}
        </p>
      ) : null}

      {status === "error" ? (
        <div className="flex shrink-0 items-start justify-between gap-2 px-0.5">
          <p className="text-[10px] leading-snug text-gold" role="status">
            {copy.error}
          </p>
          <button
            type="button"
            data-news-retry
            className="shrink-0 rounded-full border border-gold/50 px-2 py-0.5 text-[9px] font-extrabold text-gold"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {copy.retry}
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {status === "ready" && items.length > 0 ? (
          <ul className="flex min-h-[6.5rem] shrink-0 flex-col gap-1">
            {items.map((item, index) => (
              <li key={item.id} className="relative z-10">
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
                {index === 0 && showMid ? (
                  <div className="relative z-0 mt-1.5">
                    <PartnerAdSlot slot="news-mid" />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="min-h-[6.5rem] shrink-0" aria-hidden />
            {showMid ? <PartnerAdSlot slot="news-mid" /> : null}
          </>
        )}

        {showBottom ? (
          <div className="relative z-0 flex min-h-[5.5rem] flex-1 flex-col">
            <PartnerAdSlot slot="news-bottom" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

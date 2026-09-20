"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ACCUEIL_ADS_REEL_MS,
  accueilAdImageUrl,
  listAccueilAds,
  nextAccueilAdIndex,
} from "@/lib/accueil-ads";

/**
 * Accueil ad surface: one full-bleed image at a time, rotates every 5s.
 * object-top keeps faces/headers visible; optional captionLines overlay
 * stays readable even when the photo is cropped.
 */
export function AccueilAdsReel() {
  const [tick, setTick] = useState(0);
  const ads = useMemo(() => listAccueilAds().filter((ad) => accueilAdImageUrl(ad)), [tick]);
  const [index, setIndex] = useState(0);
  const ad = ads[index] ?? ads[0];
  const src = ad ? accueilAdImageUrl(ad) : "";
  const captions = ad?.captionLines?.filter(Boolean) ?? [];

  useEffect(() => {
    const onStorage = () => setTick((value) => value + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("xsnow-accueil-ads", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("xsnow-accueil-ads", onStorage);
    };
  }, []);

  useEffect(() => {
    if (ads.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => nextAccueilAdIndex(current, ads.length));
    }, ACCUEIL_ADS_REEL_MS);
    return () => window.clearInterval(timer);
  }, [ads.length]);

  useEffect(() => {
    setIndex(0);
  }, [ads.length, tick]);

  useEffect(() => {
    for (const item of ads) {
      const url = accueilAdImageUrl(item);
      if (!url || url.startsWith("data:")) continue;
      const img = new window.Image();
      img.src = url;
    }
  }, [ads]);

  if (!ad || !src) {
    return (
      <aside
        data-accueil-ads-reel
        className="opc-glass-soft relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-xl border border-gold/35 text-sm text-snow/70"
      >
        Aucune publicité pour l’instant.
      </aside>
    );
  }

  return (
    <aside
      data-accueil-ads-reel
      data-ad-id={ad.id}
      aria-label={ad.title}
      className="opc-glass-soft relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-gold/35"
    >
      <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex gap-1">
        {ads.map((item, slotIndex) => (
          <span
            key={item.id}
            className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25"
            aria-hidden
          >
            <span
              className={`block h-full bg-gold ${
                slotIndex < index
                  ? "w-full"
                  : slotIndex === index
                    ? "accueil-ads-progress"
                    : "w-0"
              }`}
              style={
                slotIndex === index
                  ? { animationDuration: `${ACCUEIL_ADS_REEL_MS}ms` }
                  : undefined
              }
            />
          </span>
        ))}
      </div>

      <Link
        href={ad.href}
        data-accueil-ad-link={ad.id}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- house + visitor data-URL ads */}
        <img
          key={ad.id}
          src={src}
          alt={ad.title}
          data-ad-image={ad.id}
          className="h-full min-h-0 w-full flex-1 object-cover object-top"
          decoding="async"
          fetchPriority="high"
        />
        {captions.length > 0 ? (
          <div
            data-accueil-ad-caption
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-black/75 px-2 py-2 text-center"
          >
            {captions.map((line) => (
              <p
                key={line}
                className="text-[11px] font-extrabold leading-tight text-snow [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] sm:text-xs"
              >
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </Link>
    </aside>
  );
}

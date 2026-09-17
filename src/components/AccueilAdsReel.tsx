"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ACCUEIL_ADS_REEL_MS,
  accueilAdImageUrl,
  listAccueilAds,
  nextAccueilAdIndex,
} from "@/lib/accueil-ads";
import { useI18n } from "@/lib/i18n/locale";

/**
 * Full-height Accueil ad slot: one image at a time, top-to-bottom, 5s rotate.
 */
export function AccueilAdsReel() {
  const ads = listAccueilAds();
  const { m } = useI18n();
  const label = m.neighborhoodNews?.partnerSponsored ?? "PUBLICITÉ";
  const slot = m.neighborhoodNews?.partnerSlot ?? "Espace partenaire";
  const [index, setIndex] = useState(0);
  const ad = ads[index] ?? ads[0]!;

  useEffect(() => {
    if (ads.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => nextAccueilAdIndex(current, ads.length));
    }, ACCUEIL_ADS_REEL_MS);
    return () => window.clearInterval(timer);
  }, [ads.length]);

  return (
    <aside
      data-accueil-ads-reel
      data-ad-id={ad.id}
      aria-label={`${label} — ${slot} — ${ad.title}`}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-dashed border-gold/40 bg-night/50"
    >
      <p className="pointer-events-none absolute left-2 top-2 z-20 rounded-full bg-black/55 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-ice/90">
        {label}
        <span aria-hidden> · </span>
        {slot}
      </p>

      <div className="pointer-events-none absolute inset-x-2 top-7 z-20 flex gap-1">
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
        className="relative block min-h-0 flex-1 overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static export house ads */}
        <img
          key={ad.id}
          src={accueilAdImageUrl(ad)}
          alt={ad.title}
          data-ad-image={ad.id}
          className="absolute inset-0 h-full w-full object-cover object-center"
          decoding="async"
          fetchPriority="low"
        />
      </Link>
    </aside>
  );
}

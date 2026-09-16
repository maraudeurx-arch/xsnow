"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import {
  adsenseClientId,
  adsenseSlotId,
  creativeForSlot,
  listPartnerCreatives,
  nextRotationIndex,
  partnerCreativeImageUrl,
  PARTNER_ROTATION_MS,
  readRotationIndex,
  usesAdsense,
  writeRotationIndex,
  type PartnerCreative,
  type PartnerSlotId,
} from "@/lib/partner-ads";

const SLOT_MIN_H: Record<PartnerSlotId, string> = {
  "news-top": "min-h-[2.4rem]",
  "news-mid": "min-h-[4.6rem]",
  "news-bottom": "min-h-[5.4rem]",
};

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function PartnerAdSlot({ slot }: { slot: PartnerSlotId }) {
  const { m } = useI18n();
  const copy = m.neighborhoodNews;
  const adsense = usesAdsense(slot);
  const client = adsenseClientId();
  const unit = adsenseSlotId(slot);
  const creatives = listPartnerCreatives();
  const [rotation, setRotation] = useState(0);
  const [creative, setCreative] = useState<PartnerCreative>(() =>
    creativeForSlot(slot, 0, creatives),
  );

  useEffect(() => {
    if (adsense || creatives.length === 0) return;
    const start = readRotationIndex(creatives.length);
    setRotation(start);
    setCreative(creativeForSlot(slot, start, creatives));

    const timer = window.setInterval(() => {
      setRotation((current) => {
        const next = nextRotationIndex(current, creatives.length);
        writeRotationIndex(next, creatives.length);
        setCreative(creativeForSlot(slot, next, creatives));
        return next;
      });
    }, PARTNER_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [adsense, creatives, slot]);

  const imageUrl = partnerCreativeImageUrl(creative);
  const external = isExternalHref(creative.href);
  const compact = slot === "news-top";

  return (
    <aside
      data-partner-slot={slot}
      data-partner-creative={creative.id}
      data-partner-rotation={rotation}
      data-partner-label="commandite"
      aria-label={`${copy.partnerSponsored} — ${copy.partnerSlot} — ${creative.name}`}
      className="shrink-0 rounded-lg border border-dashed border-gold/50 bg-white/[0.03] px-2 py-1.5 text-left"
    >
      <p className="flex flex-wrap items-center gap-1">
        <span className="inline-flex rounded-full bg-gold/25 px-1.5 py-px text-[8px] font-extrabold uppercase tracking-wide text-gold">
          {copy.partnerSponsored}
        </span>
        <span className="text-[8px] font-extrabold uppercase tracking-wide text-ice/70">
          {copy.partnerSlot}
        </span>
      </p>
      {adsense ? (
        <ins
          className={`adsbygoogle mt-1 block ${SLOT_MIN_H[slot]}`}
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={unit}
          data-ad-format="rectangle"
          data-full-width-responsive="true"
        />
      ) : (
        <div className={`mt-1 ${SLOT_MIN_H[slot]}`}>
          {external ? (
            <a
              href={creative.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-partner-link
              className="flex h-full min-h-[inherit] flex-col overflow-hidden rounded-md border border-white/10 bg-night/40 hover:border-cobalt/45"
            >
              <CreativeBody
                creative={creative}
                imageUrl={imageUrl}
                funding={copy.partnerFunding}
                compact={compact}
              />
            </a>
          ) : (
            <Link
              href={creative.href}
              data-partner-link
              className="flex h-full min-h-[inherit] flex-col overflow-hidden rounded-md border border-white/10 bg-night/40 hover:border-cobalt/45"
            >
              <CreativeBody
                creative={creative}
                imageUrl={imageUrl}
                funding={copy.partnerFunding}
                compact={compact}
              />
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}

function CreativeBody({
  creative,
  imageUrl,
  funding,
  compact,
}: {
  creative: PartnerCreative;
  imageUrl: string | null;
  funding: string;
  compact?: boolean;
}) {
  return (
    <>
      {imageUrl && !compact ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export SVG placeholders
        <img
          src={imageUrl}
          alt=""
          className="h-[3.1rem] w-full object-cover object-left"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className={`flex flex-1 flex-col justify-center gap-0.5 text-left ${compact ? "px-2 py-1" : "px-2 py-1.5"}`}>
        <p className="text-[10px] font-extrabold leading-snug text-snow">{creative.name}</p>
        <p className="text-[8px] leading-snug text-snow/75">{creative.tagline}</p>
        {compact ? null : <p className="text-[8px] leading-snug text-ice/60">{funding}</p>}
      </div>
    </>
  );
}

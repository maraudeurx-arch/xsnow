"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hrefWithLang } from "@/lib/i18n";
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
  resolvePartnerCreative,
  usesAdsense,
  writeRotationIndex,
  type PartnerCreative,
  type PartnerSlotId,
} from "@/lib/partner-ads";

const SLOT_MIN_H: Record<PartnerSlotId, string> = {
  "news-mid": "min-h-[4.6rem]",
  "news-bottom": "min-h-[7.2rem]",
};

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function PartnerAdSlot({ slot }: { slot: PartnerSlotId }) {
  const { locale, m, source } = useI18n();
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

  const display = resolvePartnerCreative(creative, copy);
  const imageUrl = partnerCreativeImageUrl(creative);
  const external = isExternalHref(display.href);
  const href = external ? display.href : hrefWithLang(display.href, locale, source);

  return (
    <aside
      data-partner-slot={slot}
      data-partner-creative={creative.id}
      data-partner-kind={creative.kind}
      data-partner-rotation={rotation}
      aria-label={`${copy.partnerSponsored} — ${copy.partnerSlot} — ${display.name}`}
      className={`${
        slot === "news-bottom" ? "flex min-h-[7.2rem] flex-1 flex-col" : "shrink-0"
      } rounded-lg border border-dashed border-gold/35 bg-white/[0.03] px-2 py-1.5 text-left`}
    >
      <p className="text-[8px] font-extrabold uppercase tracking-wide text-ice/70">
        {copy.partnerSponsored}
        <span aria-hidden> · </span>
        {copy.partnerSlot}
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
        <div
          className={`mt-1 flex flex-col ${SLOT_MIN_H[slot]} ${
            slot === "news-bottom" ? "min-h-0 flex-1" : ""
          }`}
        >
          {external ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-partner-link
              data-partner-cta={display.ctaKind}
              className="flex h-full min-h-[inherit] flex-1 flex-col overflow-hidden rounded-md border border-white/10 bg-night/40 hover:border-cobalt/45"
            >
              <CreativeBody
                name={display.name}
                tagline={display.tagline}
                cta={display.cta}
                imageUrl={imageUrl}
                funding={copy.partnerFunding}
                grow={slot === "news-bottom"}
              />
            </a>
          ) : (
            <Link
              href={href}
              data-partner-link
              data-partner-cta={display.ctaKind}
              className="flex h-full min-h-[inherit] flex-1 flex-col overflow-hidden rounded-md border border-white/10 bg-night/40 hover:border-cobalt/45"
            >
              <CreativeBody
                name={display.name}
                tagline={display.tagline}
                cta={display.cta}
                imageUrl={imageUrl}
                funding={copy.partnerFunding}
                grow={slot === "news-bottom"}
              />
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}

function CreativeBody({
  name,
  tagline,
  cta,
  imageUrl,
  funding,
  grow,
}: {
  name: string;
  tagline: string;
  cta: string;
  imageUrl: string | null;
  funding: string;
  grow: boolean;
}) {
  return (
    <>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export SVG placeholders
        <img
          src={imageUrl}
          alt=""
          className={`w-full object-cover object-left ${
            grow ? "min-h-[2.4rem] flex-1" : "h-[2.4rem]"
          }`}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className="flex shrink-0 flex-col justify-center gap-0.5 px-2 py-1.5 text-left">
        <p className="text-[10px] font-extrabold leading-snug text-snow">{name}</p>
        <p className="text-[8px] leading-snug text-snow/75">{tagline}</p>
        <span className="mt-0.5 inline-flex w-fit max-w-full items-center rounded-full bg-cobalt px-1.5 py-0.5 text-[8px] font-extrabold leading-none text-snow">
          {cta}
        </span>
        <p className="text-[8px] leading-snug text-ice/60">{funding}</p>
      </div>
    </>
  );
}

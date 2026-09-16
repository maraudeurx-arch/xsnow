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
  "news-mid": "min-h-[3.2rem]",
  "news-bottom": "min-h-0",
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
  const isBottom = slot === "news-bottom";
  const linkClass = isBottom
    ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-white/10 bg-night/40 hover:border-cobalt/45"
    : "flex h-full min-h-0 flex-1 flex-row overflow-hidden rounded-md border border-white/10 bg-night/40 hover:border-cobalt/45";

  return (
    <aside
      data-partner-slot={slot}
      data-partner-creative={creative.id}
      data-partner-kind={creative.kind}
      data-partner-rotation={rotation}
      aria-label={`${copy.partnerSponsored} — ${copy.partnerSlot} — ${display.name}`}
      className={`${
        isBottom
          ? "flex min-h-0 flex-col overflow-hidden"
          : "flex shrink-0 flex-col overflow-hidden"
      } rounded-lg border border-dashed border-gold/35 bg-white/[0.03] px-2 py-1 text-left`}
    >
      <p className="shrink-0 text-[8px] font-extrabold leading-none uppercase tracking-wide text-ice/70">
        {copy.partnerSponsored}
        <span aria-hidden> · </span>
        {copy.partnerSlot}
      </p>
      {adsense ? (
        <ins
          className={`adsbygoogle mt-0.5 block ${SLOT_MIN_H[slot]}`}
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={unit}
          data-ad-format="rectangle"
          data-full-width-responsive="true"
        />
      ) : (
        <div
          className={`mt-0.5 flex min-h-0 ${SLOT_MIN_H[slot]} ${
            isBottom ? "flex-1 flex-col" : "flex-row"
          }`}
        >
          {external ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-partner-link
              data-partner-cta={display.ctaKind}
              className={linkClass}
            >
              <CreativeBody
                name={display.name}
                tagline={display.tagline}
                cta={display.cta}
                imageUrl={imageUrl}
                funding={copy.partnerFunding}
                grow={isBottom}
                layout={isBottom ? "stack" : "row"}
              />
            </a>
          ) : (
            <Link
              href={href}
              data-partner-link
              data-partner-cta={display.ctaKind}
              className={linkClass}
            >
              <CreativeBody
                name={display.name}
                tagline={display.tagline}
                cta={display.cta}
                imageUrl={imageUrl}
                funding={copy.partnerFunding}
                grow={isBottom}
                layout={isBottom ? "stack" : "row"}
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
  layout,
}: {
  name: string;
  tagline: string;
  cta: string;
  imageUrl: string | null;
  funding: string;
  grow: boolean;
  layout: "row" | "stack";
}) {
  const row = layout === "row";
  return (
    <>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export SVG placeholders
        <img
          src={imageUrl}
          alt=""
          className={
            row
              ? "h-full w-[3.4rem] shrink-0 object-cover object-center"
              : `w-full object-cover object-left ${
                  grow ? "min-h-0 flex-1" : "h-[2.4rem]"
                }`
          }
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div
        className={`flex min-w-0 ${
          row
            ? "flex-1 flex-col justify-center gap-px px-1.5 py-0.5"
            : "shrink-0 flex-col justify-center gap-0.5 px-2 py-1"
        } text-left`}
      >
        <p className="text-[10px] font-extrabold leading-snug text-snow">{name}</p>
        <p className="text-[8px] leading-snug text-snow/75">{tagline}</p>
        <span className="mt-px inline-flex w-fit max-w-full items-center rounded-full bg-cobalt px-1.5 py-0.5 text-[8px] font-extrabold leading-none text-snow">
          {cta}
        </span>
        <p className="text-[8px] leading-snug text-ice/60">{funding}</p>
      </div>
    </>
  );
}

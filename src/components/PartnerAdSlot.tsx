"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { hrefWithLang } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { downloadCreativeImage } from "@/lib/download-creative";
import {
  adsenseClientId,
  adsenseSlotId,
  creativeForSlot,
  listPartnerCreatives,
  nextRotationIndex,
  partnerCreativeDownloadName,
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
  const grow = slot === "news-bottom";

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
  const downloadName = partnerCreativeDownloadName(creative);
  const external = isExternalHref(display.href);
  const href = external ? display.href : hrefWithLang(display.href, locale, source);
  const showDownload = Boolean(imageUrl) && !adsense;

  return (
    <aside
      data-partner-slot={slot}
      data-partner-creative={creative.id}
      data-partner-kind={creative.kind}
      data-partner-rotation={rotation}
      aria-label={`${copy.partnerSponsored} — ${copy.partnerSlot} — ${display.name}`}
      className={`${
        grow
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "shrink-0"
      } rounded-lg border border-dashed border-gold/35 bg-white/[0.03] px-2 py-1 text-left relative`}
    >
      <p className="flex shrink-0 items-center justify-between gap-1 text-[8px] font-extrabold uppercase tracking-wide text-ice/70">
        <span className="min-w-0 truncate">
          {copy.partnerSponsored}
          <span aria-hidden> · </span>
          {copy.partnerSlot}
        </span>
        {showDownload && imageUrl ? (
          <CreativeDownload
            url={imageUrl}
            filename={downloadName}
            label={copy.partnerDownload}
            ariaLabel={copy.partnerDownloadAria}
            hint={copy.partnerDownloadIosHint}
            failLabel={copy.partnerDownloadFail}
          />
        ) : null}
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
          className={`mt-1 flex min-h-0 flex-col ${
            grow ? "flex-1 overflow-hidden" : SLOT_MIN_H[slot]
          }`}
        >
          {external ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-partner-link
              data-partner-cta={display.ctaKind}
              className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-white/10 bg-night/40 hover:border-cobalt/45"
            >
              <CreativeBody
                name={display.name}
                tagline={display.tagline}
                cta={display.cta}
                imageUrl={imageUrl}
                funding={copy.partnerFunding}
                grow={grow}
              />
            </a>
          ) : (
            <Link
              href={href}
              data-partner-link
              data-partner-cta={display.ctaKind}
              className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-white/10 bg-night/40 hover:border-cobalt/45"
            >
              <CreativeBody
                name={display.name}
                tagline={display.tagline}
                cta={display.cta}
                imageUrl={imageUrl}
                funding={copy.partnerFunding}
                grow={grow}
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
            grow ? "min-h-0 max-h-[3.2rem] flex-1" : "h-[1.6rem] shrink-0"
          }`}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className="flex shrink-0 flex-col justify-center gap-px px-1.5 py-0.5 text-left">
        <p className="line-clamp-1 text-[10px] font-extrabold leading-tight text-snow">{name}</p>
        <p className="line-clamp-2 text-[8px] leading-tight text-snow/75">{tagline}</p>
        <span className="mt-px inline-flex w-fit max-w-full items-center rounded-full bg-cobalt px-1.5 py-0.5 text-[8px] font-extrabold leading-none text-snow">
          {cta}
        </span>
        <p className="line-clamp-1 text-[8px] leading-tight text-ice/60">{funding}</p>
      </div>
    </>
  );
}

function CreativeDownload({
  url,
  filename,
  label,
  ariaLabel,
  hint,
  failLabel,
}: {
  url: string;
  filename: string;
  label: string;
  ariaLabel: string;
  hint: string;
  failLabel: string;
}) {
  const [failed, setFailed] = useState(false);

  async function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    event.stopPropagation();
    setFailed(false);
    try {
      const result = await downloadCreativeImage({
        url,
        filename,
        shareTitle: ariaLabel,
      });
      if (result === "opened") {
        // iOS opened the image for long-press save — keep the Accueil slot as-is.
        setFailed(false);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFailed(true);
    }
  }

  return (
    <span className="relative inline-flex shrink-0 items-center">
      <a
        data-partner-download
        href={url}
        download={filename}
        rel="noopener"
        onClick={(event) => void onClick(event)}
        aria-label={ariaLabel}
        title={hint}
        className="tap inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-gold/55 bg-gold/15 px-1.5 py-0.5 text-[8px] font-extrabold normal-case tracking-wide text-gold hover:border-gold hover:bg-gold/25"
      >
        {label}
      </a>
      {failed ? (
        <span
          role="status"
          data-partner-download-fail
          className="absolute right-0 top-[calc(100%+2px)] z-20 w-max max-w-[11.5rem] rounded-md border border-gold/40 bg-night px-1.5 py-1 text-left text-[8px] font-semibold normal-case leading-tight tracking-normal text-gold"
        >
          {failLabel}
        </span>
      ) : null}
    </span>
  );
}

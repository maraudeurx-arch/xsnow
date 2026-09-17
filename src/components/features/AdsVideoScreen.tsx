"use client";

import { useEffect, useState } from "react";
import { HomeBackLink } from "@/components/HomeBackLink";
import {
  ADS_REEL_MS,
  communityAdImageUrl,
  formatApartmentSummary,
  listCommunityAds,
  nextAdIndex,
  prevAdIndex,
  type CommunityAd,
} from "@/lib/community-ads";
import { downloadCreativeImage } from "@/lib/download-creative";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";

export function AdsVideoScreen() {
  const ads = listCommunityAds();
  const { m } = useI18n();
  const copy = m.pubs;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const ad = ads[index] ?? ads[0]!;

  useEffect(() => {
    if (paused || ads.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => nextAdIndex(current, ads.length));
    }, ADS_REEL_MS);
    return () => window.clearInterval(timer);
  }, [paused, ads.length]);

  async function onDownload(creative: CommunityAd) {
    if (!creative.downloadable) return;
    setStatus(null);
    try {
      const result = await downloadCreativeImage({
        url: communityAdImageUrl(creative),
        filename: creative.filename,
        shareTitle: copy.ads[creative.id as keyof typeof copy.ads]?.title ?? creative.id,
      });
      if (result === "cancelled") return;
      setStatus(result === "opened" ? copy.downloadOpened : copy.downloaded);
    } catch {
      setStatus(copy.downloadError);
    }
  }

  return (
    <section
      id="ads-video-screen"
      data-ads-video-screen
      data-ad-id={ad.id}
      className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-night"
    >
      <div className="absolute z-20 w-full max-w-xl px-2 pt-2">
        <HomeBackLink className="tap inline-flex min-h-9 w-auto items-center justify-center gap-1 rounded-full border border-gold/65 bg-[rgba(8,8,12,0.88)] px-3 text-[12px] font-extrabold text-gold" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-2 top-12 z-20 flex gap-1">
          {ads.map((item, slot) => (
            <span
              key={item.id}
              className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25"
            >
              <span
                className={`block h-full bg-gold ${
                  slot < index ? "w-full" : slot === index ? "ads-reel-progress" : "w-0"
                }`}
                style={slot === index && !paused ? { animationDuration: `${ADS_REEL_MS}ms` } : undefined}
              />
            </span>
          ))}
        </div>

        <figure className="relative min-h-0 flex-1 overflow-hidden">
          {ad.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element -- static export house ads
            <img
              src={communityAdImageUrl(ad)}
              alt={copy.ads[ad.id as keyof typeof copy.ads]?.title ?? ad.id}
              className="ads-kenburns h-full w-full object-cover"
              data-ad-image={ad.id}
            />
          ) : (
            <div
              data-ad-image={ad.id}
              data-ad-card={ad.kind}
              className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[#0f172a] px-5 pb-36 pt-16 text-center"
            >
              {ad.kind === "flyer" ? (
                <div
                  aria-hidden
                  className="flex size-20 items-center justify-center rounded-full bg-cobalt text-3xl text-snow"
                >
                  ⌂
                </div>
              ) : (
                <p className="text-[11px] font-extrabold tracking-[0.18em] text-ice/90 uppercase">
                  {formatApartmentSummary(ad).city}
                </p>
              )}
              <h2 className="max-w-[16rem] font-[family-name:var(--font-fraunces)] text-2xl font-extrabold text-snow">
                {copy.ads[ad.id as keyof typeof copy.ads]?.title}
              </h2>
              {ad.id === "apartment-gatineau" ? (
                <>
                  <p data-ad-rent className="text-4xl font-black text-gold">
                    ~{formatApartmentSummary(ad).rentCad}&nbsp;$/mois
                  </p>
                  <p data-ad-date className="text-lg font-extrabold text-snow">
                    {copy.octoberFirst}
                  </p>
                </>
              ) : (
                <p className="max-w-[16rem] text-sm leading-snug text-snow/85">
                  {copy.ads[ad.id as keyof typeof copy.ads]?.tagline}
                </p>
              )}
            </div>
          )}
          <figcaption className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-10 text-left">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-ice/80">
              {copy.sponsored}
              <span aria-hidden> · </span>
              {copy.slot}
            </p>
            {ad.kind === "photo" ? (
              <>
                <h2 className="mt-1 font-[family-name:var(--font-fraunces)] text-xl font-extrabold text-snow">
                  {copy.ads[ad.id as keyof typeof copy.ads]?.title}
                </h2>
                <p className="mt-1 text-sm leading-snug text-snow/90">
                  {copy.ads[ad.id as keyof typeof copy.ads]?.tagline}
                </p>
              </>
            ) : ad.id === "apartment-gatineau" ? (
              <p className="mt-1 text-sm leading-snug text-snow/90">
                {interpolate(copy.apartmentSummary, {
                  rent: String(formatApartmentSummary(ad).rentCad),
                  date: copy.octoberFirst,
                  city: formatApartmentSummary(ad).city,
                })}
              </p>
            ) : null}
            {ad.downloadable ? (
              <button
                type="button"
                data-ad-download={ad.id}
                className="tap mt-2 inline-flex min-h-10 items-center rounded-full border border-cobalt/55 bg-cobalt px-3 text-sm font-extrabold text-snow"
                onClick={() => void onDownload(ad)}
              >
                {copy.download}
              </button>
            ) : null}
            {status ? (
              <p className="mt-1 text-xs text-gold" role="status">
                {status}
              </p>
            ) : null}
          </figcaption>
        </figure>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          className="tap min-h-10 rounded-full border border-white/20 bg-white/[0.06] px-3 text-sm font-extrabold text-snow"
          onClick={() => setIndex((current) => prevAdIndex(current, ads.length))}
        >
          {copy.prev}
        </button>
        <button
          type="button"
          data-ads-pause
          className="tap min-h-10 rounded-full border border-white/20 bg-white/[0.06] px-3 text-sm font-semibold text-snow"
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? copy.play : copy.pause}
        </button>
        <button
          type="button"
          className="tap min-h-10 rounded-full border border-cobalt/55 bg-cobalt px-3 text-sm font-extrabold text-snow"
          onClick={() => setIndex((current) => nextAdIndex(current, ads.length))}
        >
          {copy.next}
        </button>
      </div>
    </section>
  );
}

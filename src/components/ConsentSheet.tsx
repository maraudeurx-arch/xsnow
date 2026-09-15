"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { interpolate, hrefWithLang } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { FALLBACK_CITY } from "@/lib/location";
import { pathStartsWith, PRIVACY_HREF, TERMS_HREF } from "@/lib/paths";
import { usePlace } from "@/lib/place";
import { useAnalyticsConsent, useHasHydrated } from "@/lib/useAnalyticsConsent";

export function useNeedsConsentSheet() {
  const hydrated = useHasHydrated();
  const { consent } = usePlace();
  const { consent: analytics } = useAnalyticsConsent();
  return hydrated && (consent === "unset" || analytics === "unset");
}

export function ConsentSheet() {
  const hydrated = useHasHydrated();
  const pathname = usePathname();
  const { m, locale, source } = useI18n();
  const { city, consent, locating, error, requestLocation, skipLocation } = usePlace();
  const { consent: analytics, setConsent } = useAnalyticsConsent();

  const onLegal =
    pathStartsWith(pathname, PRIVACY_HREF) || pathStartsWith(pathname, TERMS_HREF);
  const needsLocation = consent === "unset";
  const needsAnalytics = analytics === "unset";
  const open = hydrated && !onLegal && (needsLocation || needsAnalytics);
  const fallbackCity = city || FALLBACK_CITY;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <section
        className="w-full max-w-md max-h-[min(85dvh,36rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,26,0.96)_0%,rgba(8,8,10,0.96)_100%)] p-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="opc-consent-title"
      >
        <p
          id="opc-consent-title"
          className="text-[13px] font-extrabold tracking-wide text-snow"
        >
          {m.consent.title}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-snow/85">{m.consent.intro}</p>

        {needsLocation ? (
          <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-2">
            <p className="text-[12px] font-extrabold text-snow">{m.consent.locationTitle}</p>
            <p className="mt-1 text-[11px] leading-snug text-snow/80">
              {interpolate(m.consent.locationBody, { city: fallbackCity })}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className="tap rounded-full border border-cobalt/55 bg-cobalt px-2 text-[12px] font-extrabold text-snow disabled:opacity-60"
                disabled={locating}
                onClick={requestLocation}
              >
                {locating ? m.geo.locating : m.consent.locationYes}
              </button>
              <button
                type="button"
                className="tap rounded-full border border-white/20 bg-white/[0.06] px-2 text-[12px] font-semibold text-snow/90 disabled:opacity-60"
                disabled={locating}
                onClick={skipLocation}
              >
                {interpolate(m.consent.locationNo, { city: fallbackCity })}
              </button>
            </div>
            {error ? (
              <p className="mt-1.5 text-[11px] leading-snug text-gold" role="status">
                {m.geo.errors[error]}
              </p>
            ) : null}
          </div>
        ) : null}

        {needsAnalytics ? (
          <div className="mt-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-2">
            <p className="text-[12px] font-extrabold text-snow">{m.consent.analyticsTitle}</p>
            <p className="mt-1 text-[11px] leading-snug text-snow/80">{m.consent.analyticsBody}</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className="tap rounded-full border border-cobalt/55 bg-cobalt px-2 text-[12px] font-extrabold text-snow"
                onClick={() => setConsent("granted")}
              >
                {m.consent.analyticsYes}
              </button>
              <button
                type="button"
                className="tap rounded-full border border-white/20 bg-white/[0.06] px-2 text-[12px] font-semibold text-snow/90"
                onClick={() => setConsent("denied")}
              >
                {m.consent.analyticsNo}
              </button>
            </div>
          </div>
        ) : null}

        <p className="mt-2 text-[11px] leading-snug text-ice/80">
          <Link
            href={hrefWithLang(PRIVACY_HREF, locale, source)}
            className="font-extrabold text-gold hover:underline"
          >
            {m.consent.privacy}
          </Link>
          {" · "}
          {m.consent.changeLater}
        </p>
      </section>
    </div>
  );
}

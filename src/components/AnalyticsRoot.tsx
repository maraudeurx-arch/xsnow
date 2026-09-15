"use client";

import { useEffect, useRef } from "react";
import { noteLang, notePlace, noteSessionStart } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";
import { useAnalyticsConsent } from "@/lib/useAnalyticsConsent";

/** Fires session_start + lang on load, and place after a real geo success — only if consented. */
export function AnalyticsRoot() {
  const { locale } = useI18n();
  const { city, countryCode, consent, source } = usePlace();
  const { granted } = useAnalyticsConsent();
  const lastLang = useRef<string | null>(null);

  useEffect(() => {
    if (!granted) {
      lastLang.current = null;
      return;
    }
    noteSessionStart();
  }, [granted]);

  useEffect(() => {
    if (!granted) return;
    if (lastLang.current === locale) return;
    lastLang.current = locale;
    noteSessionStart();
    noteLang(locale);
  }, [granted, locale]);

  useEffect(() => {
    if (!granted) return;
    if (consent !== "granted") return;
    if (source === "override" || source === "fallback") return;
    if (!city || !countryCode) return;
    notePlace(city, countryCode);
  }, [city, consent, countryCode, granted, source]);

  return null;
}

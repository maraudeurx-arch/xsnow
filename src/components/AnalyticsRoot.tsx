"use client";

import { useEffect, useRef } from "react";
import { noteLang, notePlace, noteSessionStart } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";

/** Fires session_start + lang on load, and place after a real geo success. */
export function AnalyticsRoot() {
  const { locale } = useI18n();
  const { city, countryCode, consent, source } = usePlace();
  const lastLang = useRef<string | null>(null);

  useEffect(() => {
    noteSessionStart();
  }, []);

  useEffect(() => {
    if (lastLang.current === locale) return;
    lastLang.current = locale;
    noteSessionStart();
    noteLang(locale);
  }, [locale]);

  useEffect(() => {
    if (consent !== "granted") return;
    if (source === "override" || source === "fallback") return;
    if (!city || !countryCode) return;
    notePlace(city, countryCode);
  }, [city, consent, countryCode, source]);

  return null;
}

"use client";

import { demonymFor } from "@/lib/demonym";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";

export function SiteFooter() {
  const { city } = usePlace();
  const { locale, m } = useI18n();

  return (
    <footer className="relative z-20 shrink-0 px-3 py-0.5 text-center">
      <p className="truncate text-[10px] leading-none font-medium text-snow/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
        {m.footer.before}
        <span className="font-extrabold text-gold">{demonymFor(city, locale)}</span>
        {m.footer.after}
      </p>
    </footer>
  );
}

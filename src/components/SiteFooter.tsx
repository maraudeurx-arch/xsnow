"use client";

import { LegalLinks } from "@/components/LegalLinks";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";

export function SiteFooter() {
  const { demonym } = usePlace();
  const { m } = useI18n();

  return (
    <footer className="relative z-20 mt-1 shrink-0 rounded-md border border-white/10 bg-[rgba(8,8,12,0.72)] px-2 py-0.5 text-center backdrop-blur-md sm:mt-1.5 sm:px-2.5 sm:py-1">
      <p className="text-[8px] leading-tight font-medium text-snow [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] sm:text-[10px] sm:leading-snug">
        {m.footer.before}
        <span className="font-extrabold text-gold">{demonym}</span>
        {m.footer.after}
      </p>
      <p className="mt-0.5 px-0.5 text-[8px] leading-tight font-medium text-snow [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] sm:mt-1 sm:text-[10px] sm:leading-snug">
        <LegalLinks className="inline text-[8px] leading-tight sm:text-[10px] sm:leading-snug" />
      </p>
    </footer>
  );
}

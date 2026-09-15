"use client";

import { LegalLinks } from "@/components/LegalLinks";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";

export function SiteFooter() {
  const { demonym } = usePlace();
  const { m } = useI18n();

  return (
    <footer className="relative z-20 mt-1 shrink-0 rounded-lg border border-white/10 bg-[rgba(8,8,12,0.72)] px-2.5 py-1 text-center backdrop-blur-md">
      <p className="text-[10px] leading-snug font-medium text-snow [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
        {m.footer.before}
        <span className="font-extrabold text-gold">{demonym}</span>
        {m.footer.after}
      </p>
      <p className="mt-0.5 text-[10px] leading-snug font-medium text-snow [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
        <LegalLinks className="inline text-[10px] leading-snug" />
      </p>
    </footer>
  );
}

"use client";

import { LegalLinks } from "@/components/LegalLinks";
import { useI18n } from "@/lib/i18n/locale";

export function SiteFooter() {
  const { m } = useI18n();

  return (
    <footer className="opc-glass-soft relative z-20 mt-0 shrink-0 rounded px-1.5 py-0 text-center">
      <p className="text-[13px] leading-snug font-medium text-snow [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
        {m.footer.before}
        {m.footer.after}
      </p>
      <p className="mt-px px-0.5 text-[13px] leading-snug font-medium text-snow [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
        <LegalLinks className="inline text-[13px] leading-snug" />
      </p>
    </footer>
  );
}

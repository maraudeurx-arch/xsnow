"use client";

import { LegalLinks } from "@/components/LegalLinks";
import { RotatingFooterSlogan } from "@/components/RotatingFooterSlogan";

export function SiteFooter() {
  return (
    <footer className="opc-glass-soft relative z-20 mt-0 shrink-0 rounded px-1.5 py-0 text-center">
      <p className="footer-slogan-line font-[family-name:var(--font-brand)] leading-none font-bold tracking-[0.01em] text-gold [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]">
        <RotatingFooterSlogan />
      </p>
      <p className="mt-px px-0.5 text-[6.5px] leading-snug font-medium">
        <LegalLinks
          className="inline text-[6.5px] leading-snug"
          linkClassName="font-extrabold text-snow hover:underline"
          separatorClassName="px-0.5 text-snow/50"
        />
      </p>
    </footer>
  );
}

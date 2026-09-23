"use client";

import { LegalLinks } from "@/components/LegalLinks";
import { RotatingFooterSlogan } from "@/components/RotatingFooterSlogan";

export function SiteFooter() {
  return (
    <footer className="opc-glass-soft relative z-20 mt-0 shrink-0 rounded-2xl px-2 py-1.5 text-center">
      <p className="footer-slogan-line font-[family-name:var(--font-brand)] leading-tight font-bold tracking-[0.01em] text-slate-800">
        <RotatingFooterSlogan />
      </p>
      <p className="mt-1 px-0.5 text-xs leading-snug font-medium">
        <LegalLinks
          className="inline text-xs leading-snug"
          linkClassName="font-semibold text-slate-700 hover:underline"
          separatorClassName="px-1 text-slate-400"
        />
      </p>
    </footer>
  );
}

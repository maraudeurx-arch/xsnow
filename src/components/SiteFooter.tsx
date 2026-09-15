"use client";

import { BRAND } from "@/lib/content";
import { usePlace } from "@/lib/place";

export function SiteFooter() {
  const { demonym } = usePlace();

  return (
    <footer className="relative z-20 shrink-0 px-3 py-0.5 text-center">
      <p className="truncate text-[10px] leading-none font-medium text-snow/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
        {BRAND.footerBefore}
        <span className="font-extrabold text-gold">{demonym}</span>
        {BRAND.footerAfter}
      </p>
    </footer>
  );
}

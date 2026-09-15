"use client";

import Link from "next/link";
import { hrefWithLang } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";

export const homeBackBarClass =
  "tap inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-gold/65 bg-[rgba(8,8,12,0.94)] px-3 text-[13px] font-extrabold text-gold shadow-[0_6px_16px_rgba(0,0,0,0.35)]";

export function HomeBackLink({
  className = homeBackBarClass,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const { m, locale, source } = useI18n();
  return (
    <Link
      href={hrefWithLang("/", locale, source)}
      aria-label={m.nav.backHomeAria}
      data-home-back
      className={className}
      onClick={onClick}
    >
      <span aria-hidden>←</span>
      {m.nav.backHome}
    </Link>
  );
}

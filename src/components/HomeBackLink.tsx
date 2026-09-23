"use client";

import Link from "next/link";
import { hrefWithLang } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";

export const homeBackBarClass =
  "tap inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-cobalt bg-white px-3 text-sm font-bold text-cobalt";

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

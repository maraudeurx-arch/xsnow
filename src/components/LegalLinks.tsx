"use client";

import Link from "next/link";
import { hrefWithLang } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { PRIVACY_HREF, TERMS_HREF } from "@/lib/paths";

export function LegalLinks({ className = "" }: { className?: string }) {
  const { m, locale, source } = useI18n();
  return (
    <p className={className}>
      <Link
        href={hrefWithLang(PRIVACY_HREF, locale, source)}
        className="font-extrabold text-gold hover:underline"
      >
        {m.footer.privacy}
      </Link>
      <span className="text-snow/50"> · </span>
      <Link
        href={hrefWithLang(TERMS_HREF, locale, source)}
        className="font-extrabold text-gold hover:underline"
      >
        {m.footer.terms}
      </Link>
    </p>
  );
}

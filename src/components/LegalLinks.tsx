"use client";

import Link from "next/link";
import { hrefWithLang } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { TRUST_NAV } from "@/lib/paths";

export function LegalLinks({ className = "" }: { className?: string }) {
  const { m, locale, source } = useI18n();
  return (
    <span className={className}>
      {TRUST_NAV.map((item, index) => (
        <span key={item.href}>
          {index > 0 ? <span className="px-0.5 text-snow/50"> · </span> : null}
          <Link
            href={hrefWithLang(item.href, locale, source)}
            className="inline-block px-0.5 font-extrabold text-gold hover:underline"
          >
            {m.footer[item.footerKey]}
          </Link>
        </span>
      ))}
    </span>
  );
}

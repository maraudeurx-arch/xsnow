"use client";

import Link from "next/link";
import { hrefWithLang } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { TRUST_NAV } from "@/lib/paths";

export function LegalLinks({
  className = "",
  linkClassName = "font-extrabold text-gold hover:underline",
  separatorClassName = "px-0.5 text-snow/50",
}: {
  className?: string;
  linkClassName?: string;
  separatorClassName?: string;
}) {
  const { m, locale, source } = useI18n();
  return (
    <span className={className}>
      {TRUST_NAV.map((item, index) => (
        <span key={item.href}>
          {index > 0 ? <span className={separatorClassName}> · </span> : null}
          <Link
            href={hrefWithLang(item.href, locale, source)}
            className={`inline-block px-0.5 py-px ${linkClassName}`}
          >
            {m.footer[item.footerKey]}
          </Link>
        </span>
      ))}
    </span>
  );
}

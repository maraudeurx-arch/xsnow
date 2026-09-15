"use client";

import Link from "next/link";
import { LocalizedFeature } from "@/components/LocalizedFeature";
import { useI18n } from "@/lib/i18n/locale";

const LINKS = [
  { href: "/telephone", key: "telephone" as const },
  { href: "/alertes", key: "alertes" as const },
];

export function LocalizedServicesList() {
  const { m } = useI18n();
  return (
    <LocalizedFeature feature="services">
      <ul className="grid gap-2">
        {LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="tap flex min-h-14 flex-col justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:border-gold/50"
            >
              <span className="font-extrabold">{m.menu[item.key]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </LocalizedFeature>
  );
}

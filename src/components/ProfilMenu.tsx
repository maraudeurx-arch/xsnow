"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { headerNavBtnClass } from "@/components/AccueilMenu";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { LocalProfileBoard } from "@/components/LocalProfileBoard";
import { useI18n } from "@/lib/i18n/locale";
import { pathMatches } from "@/lib/paths";

const PROFILE_LINKS = [
  { href: "/mon-profil/reglages", key: "reglages" as const },
  { href: "/mon-profil/a-propos", key: "aPropos" as const },
];

export function ProfilMenu() {
  const pathname = usePathname();
  const { m } = useI18n();

  return (
    <div className="grid gap-3">
      <LocalProfileBoard />
      <nav aria-label={m.nav.monProfil} className="grid gap-1.5">
        {PROFILE_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${headerNavBtnClass(pathMatches(pathname, item.href))} w-full min-h-11 justify-start px-3 py-2 text-left whitespace-normal`}
          >
            {m.profile[item.key]}
          </Link>
        ))}
        <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <LanguageSwitch />
        </div>
      </nav>
    </div>
  );
}

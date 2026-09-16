"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccueilMenu, headerNavBtnClass } from "@/components/AccueilMenu";
import { ConnectWallet } from "@/components/ConnectWallet";
import { useI18n } from "@/lib/i18n/locale";
import { pathMatches, pathStartsWith } from "@/lib/paths";

const HEADER_HREFS = [
  { href: "/mes-services", key: "mesServices" as const },
  { href: "/en-demande", key: "enDemande" as const },
  { href: "/mon-profil", key: "monProfil" as const },
];

export function HeaderNav() {
  const pathname = usePathname();
  const { m } = useI18n();

  return (
    <nav
      aria-label={m.nav.main}
      className="relative mt-0.5 grid w-full grid-cols-5 items-stretch gap-[var(--home-nav-gap)] overflow-visible"
    >
      <AccueilMenu key={pathname} compact />
      {HEADER_HREFS.map((item) => {
        const active =
          item.href === "/mon-profil"
            ? pathStartsWith(pathname, item.href)
            : pathMatches(pathname, item.href);
        const offer = item.href !== "/mon-profil";
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${headerNavBtnClass(active, true)} min-w-0 w-full justify-self-stretch ${
              offer && !active ? "border-gold/45" : ""
            }`}
          >
            {m.nav[item.key]}
          </Link>
        );
      })}
      <ConnectWallet compact />
    </nav>
  );
}

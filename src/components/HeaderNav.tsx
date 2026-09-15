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
      className="relative mt-0 flex w-full flex-col gap-0.5 overflow-visible"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <AccueilMenu key={pathname} />
        <div className="shrink-0">
          <ConnectWallet />
        </div>
      </div>

      <div className="mt-1 grid w-full grid-cols-3 items-center gap-1.5">
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
              className={`${headerNavBtnClass(active, true)} tap w-full justify-self-stretch text-[12px] leading-tight ${
                offer && !active ? "border-gold/45" : ""
              }`}
            >
              {m.nav[item.key]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

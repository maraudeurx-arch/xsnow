"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccueilMenu, headerNavBtnClass } from "@/components/AccueilMenu";
import { ConnectWallet } from "@/components/ConnectWallet";
import { HEADER_NAV } from "@/lib/content";
import { pathMatches } from "@/lib/paths";

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="relative mt-1.5 flex w-full flex-col gap-1.5 overflow-visible"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <AccueilMenu />
        <div className="shrink-0">
          <ConnectWallet />
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center gap-1.5">
        {HEADER_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${headerNavBtnClass(pathMatches(pathname, item.href))}${
              item.href === "/mon-profil" ? " ml-auto" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

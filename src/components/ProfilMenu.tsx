"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { headerNavBtnClass } from "@/components/AccueilMenu";
import { PROFILE_MENU } from "@/lib/content";
import { pathMatches } from "@/lib/paths";

export function ProfilMenu() {
  const pathname = usePathname();

  return (
    <nav aria-label="Mon profil" className="grid gap-1.5">
      {PROFILE_MENU.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${headerNavBtnClass(pathMatches(pathname, item.href))} w-full min-h-11 justify-start px-3 py-2 text-left whitespace-normal`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

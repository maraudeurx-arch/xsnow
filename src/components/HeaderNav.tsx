"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccueilMenu, headerNavBtnClass } from "@/components/AccueilMenu";
import { HEADER_NAV } from "@/lib/content";

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="relative mt-1.5 flex w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5"
    >
      <AccueilMenu />
      {HEADER_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={headerNavBtnClass(pathname === item.href)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

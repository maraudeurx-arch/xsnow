"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ACCUEIL_MENU,
  COMMUNITY_MENU,
  PROFESSIONNELLE_MENU,
  SAFETY_SERVICES_MENU,
} from "@/lib/content";
import { SERVICE_LIST } from "@/lib/services";

export const headerNavBtnClass = (active = false) =>
  `inline-flex min-h-[22px] shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl border px-2 py-0.5 text-[11px] font-extrabold tracking-wide shadow-[0_4px_14px_rgba(37,99,235,0.28)] ${
    active
      ? "border-gold/70 bg-gold/15 text-gold"
      : "border-cobalt/55 bg-cobalt text-snow"
  }`;

const itemClass = (active: boolean) =>
  `flex items-center rounded-lg border px-1.5 py-1 text-left text-[11px] leading-snug font-semibold whitespace-normal ${
    active
      ? "border-gold/70 bg-gold/10 text-gold"
      : "border-white/10 bg-white/[0.04] text-snow/90 hover:border-violet/40 hover:bg-white/[0.07]"
  }`;

export function AccueilMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative z-40 shrink-0" data-accueil>
      <button
        type="button"
        className={headerNavBtnClass(false)}
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
      >
        <span>Accueil</span>
        <span aria-hidden className="text-[10px] font-bold">
          {open ? "–" : "+"}
        </span>
      </button>

      {open ? (
        <nav
          aria-label="Propositions Accueil"
          className="absolute top-full left-0 z-50 mt-1.5 max-h-[min(68dvh,32rem)] w-[min(calc(100vw-1.5rem),20rem)] space-y-1.5 overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,26,0.98)_0%,rgba(8,8,10,0.98)_100%)] p-1.5 pr-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
        >
          <Group title="Communauté">
            {COMMUNITY_MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(pathname === item.href)}
              >
                {item.label}
              </Link>
            ))}
            {SERVICE_LIST.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(pathname === item.href)}
              >
                {item.title}
              </Link>
            ))}
          </Group>
          <Group title="Services">
            {SAFETY_SERVICES_MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(pathname === item.href)}
              >
                {item.label}
              </Link>
            ))}
          </Group>
          <Group title="Professionnelle">
            {PROFESSIONNELLE_MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(pathname === item.href)}
              >
                {item.label}
              </Link>
            ))}
          </Group>
          <Group title="Découvrir">
            {ACCUEIL_MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(pathname === item.href)}
              >
                {item.label}
              </Link>
            ))}
          </Group>
        </nav>
      ) : null}
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-0.5 px-1 text-[9px] font-extrabold tracking-[0.12em] text-gold uppercase">
        {title}
      </p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

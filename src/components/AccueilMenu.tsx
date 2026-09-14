"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ACCUEIL_MENU, LEFT_MENU } from "@/lib/content";
import { SERVICE_LIST } from "@/lib/services";

const itemClass = (active: boolean) =>
  `flex items-center rounded-lg border px-1.5 py-1 text-left text-[9px] leading-tight font-semibold ${
    active
      ? "border-gold/70 bg-gold/10 text-gold"
      : "border-white/10 bg-white/[0.04] text-snow/90 hover:border-violet/40 hover:bg-white/[0.07]"
  }`;

export function AccueilMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-[min(100%,17.5rem)]" data-accueil>
      <button
        type="button"
        className="inline-flex min-h-[22px] items-center justify-between gap-2 rounded-xl border border-cobalt/55 bg-cobalt px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-snow shadow-[0_4px_14px_rgba(37,99,235,0.28)]"
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
          className="absolute top-full left-0 z-40 mt-1.5 max-h-[min(62dvh,28rem)] w-full space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,26,0.98)_0%,rgba(8,8,10,0.98)_100%)] p-1.5 pr-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
        >
          <Group title="Communauté">
            {LEFT_MENU.map((item) => (
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
          <Group title="Services">
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
      <p className="mb-0.5 px-1 text-[7px] font-extrabold tracking-[0.14em] text-gold uppercase">
        {title}
      </p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { HomeBackLink } from "@/components/HomeBackLink";
import { useI18n } from "@/lib/i18n/locale";
import { pathMatches } from "@/lib/paths";
import { CATALOG_SERVICE_LIST } from "@/lib/services";

export const headerNavBtnClass = (active = false, compact = false) =>
  `inline-flex shrink-0 items-center justify-center gap-0.5 rounded-full border font-bold tracking-tight ${
    compact
      ? "header-nav-chip min-h-[var(--home-nav-h)] min-w-0 px-1 py-0.5 text-[12px] leading-[1.15] whitespace-normal"
      : "min-h-11 px-3.5 py-1 text-base whitespace-nowrap"
  } ${
    active
      ? "border-transparent bg-cobalt text-white shadow-[0_6px_16px_rgba(0,110,253,0.28)]"
      : "border-slate-200 bg-white text-slate-900 shadow-none"
  }`;

const itemClass = (active: boolean) =>
  `flex min-h-11 items-center rounded-xl border px-2.5 py-1.5 text-left text-sm leading-snug font-semibold whitespace-normal ${
    active
      ? "border-transparent bg-cobalt text-white"
      : "border-slate-200 bg-white text-slate-800 hover:border-cobalt/40"
  }`;

const INVOLVE = [{ href: "/vos-idees", key: "vosIdees" as const }];
const OFFERS = [
  { href: "/mes-services", key: "mesServices" as const },
  { href: "/en-demande", key: "enDemande" as const },
];
const COMMUNITY = [{ href: "/proximite", key: "proximite" as const }];
const SAFETY = [
  { href: "/telephone", key: "telephone" as const },
  { href: "/alertes", key: "alertes" as const },
];
const PRO = [
  { href: "/gagner-maintenant", key: "gagnerMaintenant" as const },
  { href: "/business", key: "business" as const },
  { href: "/monetise", key: "monetise" as const },
  { href: "/sondages", key: "sondages" as const },
];
const SOON = [
  { href: "/reportage", key: "reportage" as const },
  { href: "/scenarios", key: "scenarios" as const },
];

export function AccueilMenu({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { m } = useI18n();

  const close = () => setOpen(false);

  return (
    <div className="relative z-40 min-w-0 w-full shrink-0" data-accueil>
      <button
        type="button"
        className={`${headerNavBtnClass(false, compact)} ${compact ? "w-full" : "tap min-h-11"}`}
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
      >
        <span>{m.nav.accueil}</span>
        <span aria-hidden className="text-[9px] font-bold">
          {open ? "–" : "+"}
        </span>
      </button>

      {open ? (
        <nav
          aria-label={m.nav.accueilProposals}
          className="opc-glass-menu absolute top-full left-0 z-50 mt-1.5 flex max-h-[min(68dvh,32rem)] w-[min(calc(100vw-1.5rem),20rem)] flex-col overflow-hidden rounded-xl p-1.5 pr-1"
        >
          <div className="opc-glass-soft sticky top-0 z-10 -mx-0.5 mb-1.5 shrink-0 rounded-lg py-0.5">
            <HomeBackLink
              className={`${itemClass(pathMatches(pathname, "/"))} justify-center border-gold/50 font-extrabold`}
              onClick={close}
            />
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden">
          <Group title={m.nav.vosIdees}>
            {INVOLVE.map((item) => (
              <Link
                key={item.href}
                href={`${item.href}/#form`}
                className={`${itemClass(pathMatches(pathname, item.href))} border-gold/50`}
                onClick={close}
              >
                {m.menu.vosIdees}
              </Link>
            ))}
            <Link
              href="/mon-profil/inviter"
              className={itemClass(pathMatches(pathname, "/mon-profil/inviter"))}
              onClick={close}
            >
              {m.shareOpc.title}
            </Link>
          </Group>
          <Group title={m.menu.offres}>
            {OFFERS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(pathMatches(pathname, item.href.split("?")[0]))}
                onClick={close}
              >
                {m.nav[item.key]}
              </Link>
            ))}
          </Group>
          <Group title={m.menu.communaute}>
            {COMMUNITY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(pathMatches(pathname, item.href.split("?")[0]))}
                onClick={close}
              >
                {m.menu[item.key]}
              </Link>
            ))}
            {CATALOG_SERVICE_LIST.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(pathMatches(pathname, item.href))}
                onClick={close}
              >
                {m.services[item.kind].title}
              </Link>
            ))}
          </Group>
          <Group title={m.menu.services}>
            {SAFETY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(pathMatches(pathname, item.href))}
                onClick={close}
              >
                {m.menu[item.key]}
              </Link>
            ))}
          </Group>
          <Group title={m.menu.professionnelle}>
            {PRO.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(pathMatches(pathname, item.href))}
                onClick={close}
              >
                {m.menu[item.key]}
              </Link>
            ))}
          </Group>
          <Group title={m.menu.coming2027} uppercase={false}>
            {SOON.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass(pathMatches(pathname, item.href))}
                onClick={close}
              >
                {m.menu[item.key]}
              </Link>
            ))}
          </Group>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function Group({
  title,
  children,
  uppercase = true,
}: {
  title: string;
  children: ReactNode;
  uppercase?: boolean;
}) {
  return (
    <div>
      <p
        className={`mb-0.5 px-1 text-[9px] font-extrabold text-gold ${
          uppercase ? "tracking-[0.12em] uppercase" : "tracking-wide"
        }`}
      >
        {title}
      </p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

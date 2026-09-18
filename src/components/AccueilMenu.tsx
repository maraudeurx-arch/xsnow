"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { HomeBackLink } from "@/components/HomeBackLink";
import { useI18n } from "@/lib/i18n/locale";
import { pathMatches } from "@/lib/paths";
import { SERVICE_LIST } from "@/lib/services";

export const headerNavBtnClass = (active = false, compact = false) =>
  `inline-flex shrink-0 items-center justify-center gap-0.5 rounded-lg border font-extrabold tracking-wide shadow-[0_4px_14px_rgba(37,99,235,0.28)] ${
    compact
      ? "min-h-[var(--home-nav-h)] min-w-0 px-0.5 py-0 text-[9px] leading-[1.05] whitespace-normal"
      : "min-h-11 px-3 py-0.5 text-[12px] whitespace-nowrap"
  } ${
    active
      ? "border-gold/70 bg-gold/15 text-gold"
      : "border-cobalt/55 bg-cobalt text-snow"
  }`;

const itemClass = (active: boolean) =>
  `flex min-h-11 items-center rounded-lg border px-1.5 py-1 text-left text-[11px] leading-snug font-semibold whitespace-normal ${
    active
      ? "border-gold/70 bg-gold/10 text-gold"
      : "border-white/10 bg-white/[0.04] text-snow/90 hover:border-violet/40 hover:bg-white/[0.07]"
  }`;

const INVOLVE = [{ href: "/vos-idees", key: "vosIdees" as const }];
const OFFERS = [
  { href: "/mes-services", key: "mesServices" as const },
  { href: "/en-demande", key: "enDemande" as const },
  { href: "/en-demande/?kind=car-morning", key: "carMorning" as const },
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
          className="opc-glass-menu absolute top-full left-0 z-50 mt-1.5 max-h-[min(68dvh,32rem)] w-[min(calc(100vw-1.5rem),20rem)] space-y-1.5 overflow-y-auto overflow-x-hidden rounded-xl p-1.5 pr-1"
        >
          <HomeBackLink
            className={`${itemClass(pathMatches(pathname, "/"))} justify-center border-gold/50 font-extrabold`}
            onClick={close}
          />
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
                {item.key === "carMorning" ? m.menu.carMorning : m.nav[item.key]}
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
            {SERVICE_LIST.map((item) => (
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

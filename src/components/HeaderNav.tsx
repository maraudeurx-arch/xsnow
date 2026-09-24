"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccueilMenu, headerNavBtnClass } from "@/components/AccueilMenu";
import { ConnectWallet } from "@/components/ConnectWallet";
import { AVATAR_RINGS, avatarById } from "@/lib/avatars";
import { useI18n } from "@/lib/i18n/locale";
import { pathMatches, pathStartsWith } from "@/lib/paths";
import { useStoredAvatar } from "@/lib/useStoredAvatar";

const HEADER_HREFS = [
  { href: "/mes-services", key: "mesServices" as const },
  { href: "/en-demande", key: "enDemande" as const },
  { href: "/mon-profil", key: "monProfil" as const },
];

export function HeaderNav() {
  const pathname = usePathname();
  const { m } = useI18n();
  const [avatarId] = useStoredAvatar();
  const ring = avatarId ? AVATAR_RINGS[avatarById(avatarId).ring] : undefined;

  return (
    <nav
      aria-label={m.nav.main}
      data-header-nav
      className="relative mt-1 grid w-full grid-cols-5 items-stretch gap-[var(--home-nav-gap)] overflow-visible"
      style={ring ? ({ "--avatar-ring": ring } as CSSProperties) : undefined}
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

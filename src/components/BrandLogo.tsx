"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/locale";
import { assetUrl } from "@/lib/paths";

/** Official white network mark, opposite the place wordmark. Compact on short phones. */
export function BrandLogo() {
  const { m } = useI18n();
  return (
    <Link
      href="/"
      aria-label={m.logoAria}
      className="inline-flex size-[var(--home-logo)] shrink-0 items-center justify-center overflow-visible"
    >
      {/* Plain img: next/image omitted basePath and 404'd on GitHub Pages. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetUrl("/brand/open-community-logo-white.png")}
        alt=""
        width={1024}
        height={1024}
        decoding="async"
        draggable={false}
        className="logo-rock size-[var(--home-logo)]"
      />
    </Link>
  );
}

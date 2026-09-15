"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/locale";
import { assetUrl } from "@/lib/paths";

/** Official white network mark. ~72px on iPhone, opposite the place wordmark. */
export function BrandLogo() {
  const { m } = useI18n();
  return (
    <Link
      href="/"
      aria-label={m.logoAria}
      className="inline-flex size-18 shrink-0 items-center justify-center overflow-visible"
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
        className="logo-rock size-18"
      />
    </Link>
  );
}

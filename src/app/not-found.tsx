"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/locale";
import { PUBLIC_SITE_URL } from "@/lib/paths";

export default function NotFound() {
  const { m } = useI18n();
  return (
    <div className="text-center">
      <p className="font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">
        {m.notFound.title}
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-snow/80">
        {m.notFound.githubPagesHint}
      </p>
      <a
        href={PUBLIC_SITE_URL}
        data-install-url
        className="mt-2 inline-block break-all font-mono text-xs font-bold text-gold underline-offset-2 hover:underline"
      >
        {PUBLIC_SITE_URL}
      </a>
      <Link href="/" className="tap mt-4 inline-flex items-center rounded-full bg-cobalt px-5 font-extrabold text-snow">
        {m.notFound.back}
      </Link>
    </div>
  );
}

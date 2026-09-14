import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { HeaderNav } from "@/components/HeaderNav";
import { SeasonalBackdrop, SeasonScene } from "@/components/SeasonalBackdrop";
import { SiteFooter } from "@/components/SiteFooter";
import { BRAND } from "@/lib/content";
import { seasonFromDate } from "@/lib/season";

export function AppChrome({ children }: { children: ReactNode }) {
  const calendarSeason = seasonFromDate();

  return (
    <div className="safe-frame relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-sky-400">
      <Suspense fallback={<SeasonScene season={calendarSeason} />}>
        <SeasonalBackdrop />
      </Suspense>

      <header className="relative z-30 shrink-0 overflow-visible">
        <div className="flex w-full items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center text-[1.25rem] leading-none font-black tracking-tight text-gold [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-[1.55rem]"
          >
            {BRAND.name}
          </Link>
          <BrandLogo />
        </div>

        <HeaderNav />

        <div className="mt-1 text-center sm:mt-2">
          <h1 className="mx-auto font-[family-name:var(--font-fraunces)] text-[clamp(2.05rem,9.6vw,5.5rem)] leading-[0.88] font-extrabold text-balance text-snow [text-shadow:0_2px_18px_rgba(0,0,0,0.72)]">
            {BRAND.community}
          </h1>
          <p className="mt-0 text-[clamp(0.68rem,2.4vw,1.05rem)] font-semibold tracking-wide text-gold [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]">
            {BRAND.slogan}
          </p>
        </div>
      </header>

      <main className="relative z-20 flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-y-auto px-3 py-0.5 text-center">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

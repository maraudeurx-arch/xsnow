import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { HeaderNav } from "@/components/HeaderNav";
import { SeasonalBackdrop } from "@/components/SeasonalBackdrop";
import { SiteFooter } from "@/components/SiteFooter";
import { BRAND } from "@/lib/content";
import { seasonFromDate } from "@/lib/season";

export function AppChrome({ children }: { children: ReactNode }) {
  const calendarSeason = seasonFromDate();

  return (
    <div className="safe-frame relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-[linear-gradient(180deg,#050506_0%,#0a0a0c_100%)]">
      <Suspense
        fallback={
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="season-wash" data-season={calendarSeason} />
          </div>
        }
      >
        <SeasonalBackdrop />
      </Suspense>

      <header className="relative z-30 shrink-0 overflow-visible">
        <div className="flex w-full items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center text-[1.25rem] leading-none font-black tracking-tight text-gold sm:text-[1.55rem]"
          >
            {BRAND.name}
          </Link>
          <BrandLogo />
        </div>

        <HeaderNav />

        <div className="mt-2 text-center sm:mt-3">
          <h1 className="mx-auto font-[family-name:var(--font-fraunces)] text-[clamp(2.3rem,10.4vw,5.5rem)] leading-[0.9] font-extrabold text-balance text-snow">
            {BRAND.community}
          </h1>
          <p className="mt-0.5 text-[clamp(0.7rem,2.6vw,1.05rem)] font-semibold tracking-wide text-gold">
            {BRAND.slogan}
          </p>
        </div>
      </header>

      <main className="relative z-20 flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-y-auto px-3 py-1 text-center">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

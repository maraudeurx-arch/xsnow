import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { HeaderNav } from "@/components/HeaderNav";
import { PlaceWordmark } from "@/components/PlaceWordmark";
import { SeasonalBackdrop, SeasonScene } from "@/components/SeasonalBackdrop";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandCopy } from "@/components/BrandCopy";
import { seasonFromDate } from "@/lib/season";

export function AppChrome({ children }: { children: ReactNode }) {
  const calendarSeason = seasonFromDate();

  return (
    <div className="safe-frame relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-sky-400">
      <Suspense fallback={<SeasonScene season={calendarSeason} />}>
        <SeasonalBackdrop />
      </Suspense>

      <header className="relative z-30 shrink-0 overflow-visible">
        <div className="chrome-panel overflow-visible rounded-2xl px-2 py-1.5">
          <div className="flex w-full items-center justify-between gap-2">
            <Link
              href="/"
              className="inline-flex items-center text-[1.15rem] leading-none font-black tracking-tight text-gold [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-[1.45rem]"
            >
              <PlaceWordmark />
            </Link>
            <BrandLogo />
          </div>

          <HeaderNav />

          <div className="mt-1 text-center">
            <h1 className="mx-auto font-[family-name:var(--font-fraunces)] text-[clamp(1.35rem,6.4vw,3.4rem)] leading-[0.94] font-extrabold text-balance text-snow [text-shadow:0_2px_18px_rgba(0,0,0,0.72)]">
              <BrandCopy field="community" />
            </h1>
            <p className="mt-0.5 text-[clamp(0.7rem,2.3vw,1.05rem)] font-semibold tracking-wide text-gold [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]">
              <BrandCopy field="slogan" />
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-20 mt-1.5 flex min-h-0 w-full flex-1 flex-col items-center justify-[safe_center] overflow-y-auto px-0 py-0 text-center">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

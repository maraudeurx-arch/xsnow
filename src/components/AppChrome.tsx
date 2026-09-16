import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { HeaderNav } from "@/components/HeaderNav";
import { HeaderProfileLabel } from "@/components/HeaderProfileLabel";
import { PlaceWordmark, PlaceDocumentTitle } from "@/components/PlaceWordmark";
import { SeasonalBackdrop, SeasonScene } from "@/components/SeasonalBackdrop";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandCopy } from "@/components/BrandCopy";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <div className="safe-frame relative flex flex-col overflow-hidden bg-sky-400">
      <PlaceDocumentTitle />
      <Suspense fallback={<SeasonScene season="autumn" />}>
        <SeasonalBackdrop />
      </Suspense>

      <div className="app-stage">
        <header className="brand-banner">
          <h1 className="mx-auto font-[family-name:var(--font-fraunces)] leading-[0.86] font-extrabold text-balance text-snow [text-shadow:0_2px_18px_rgba(0,0,0,0.72)]">
            <BrandCopy field="community" />
          </h1>
          <p className="mt-px font-semibold tracking-wide text-gold [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]">
            <BrandCopy field="slogan" />
          </p>
        </header>

        <div className="relative z-30 shrink-0 overflow-visible">
          <div className="chrome-panel overflow-visible rounded-xl px-1.5 py-0.5">
            <div className="flex w-full items-center justify-between gap-2">
              <Link
                href="/"
                className="inline-flex items-center text-[1.02rem] leading-none font-black tracking-tight text-gold [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-[1.45rem]"
              >
                <PlaceWordmark />
              </Link>
              <div className="inline-flex min-w-0 items-center gap-1.5">
                <HeaderProfileLabel />
                <BrandLogo />
              </div>
            </div>

            <HeaderNav />
          </div>
        </div>

        <main className="app-stage-main">
          {children}
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

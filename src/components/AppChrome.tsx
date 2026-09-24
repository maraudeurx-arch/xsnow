import { Suspense, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { HeaderNav } from "@/components/HeaderNav";
import { HeaderProfileLabel } from "@/components/HeaderProfileLabel";
import { HeaderPlaceWithAvatar } from "@/components/HeaderPlaceWithAvatar";
import { PlaceDocumentTitle } from "@/components/PlaceWordmark";
import { SeasonalBackdrop, SeasonScene } from "@/components/SeasonalBackdrop";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandCopy } from "@/components/BrandCopy";
import { RotatingBrandSlogan } from "@/components/RotatingBrandSlogan";
import { PagesScopeRedirect } from "@/components/PagesScopeRedirect";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
      <div className="safe-frame relative flex flex-col overflow-hidden bg-[#e8f1ff]">
      <PagesScopeRedirect />
      <PlaceDocumentTitle />
      <Suspense fallback={<SeasonScene season="autumn" />}>
        <SeasonalBackdrop />
      </Suspense>

      <div className="app-stage">
        <header className="brand-banner">
          <h1 className="mx-auto font-[family-name:var(--font-brand)] leading-[0.92] font-extrabold tracking-[-0.02em] text-balance text-snow [text-shadow:0_2px_18px_rgba(0,0,0,0.72)]">
            <BrandCopy field="community" />
          </h1>
          <p className="mx-auto mt-0.5 w-full max-w-full overflow-hidden font-[family-name:var(--font-brand)] text-base leading-tight font-bold tracking-[0.01em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.55)] sm:text-lg">
            <RotatingBrandSlogan />
          </p>
        </header>

        <div className="relative z-30 shrink-0 overflow-visible">
          <div className="chrome-panel chrome-shell overflow-visible rounded-2xl px-2 py-1.5">
            <div className="flex w-full items-center justify-between gap-2">
              <HeaderPlaceWithAvatar />
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

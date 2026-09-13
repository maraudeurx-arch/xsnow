import Link from "next/link";
import { type ReactNode } from "react";
import { AccueilMenu } from "@/components/AccueilMenu";
import { ConnectWallet } from "@/components/ConnectWallet";
import { ConstructionWatermark } from "@/components/ConstructionWatermark";
import { SiteFooter } from "@/components/SiteFooter";
import { Snowfield } from "@/components/Snowfield";
import { BRAND } from "@/lib/content";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <div className="safe-frame relative flex min-h-dvh flex-col overflow-x-hidden bg-[radial-gradient(1200px_circle_at_20%_-10%,#16324d_0%,transparent_55%),radial-gradient(900px_circle_at_90%_10%,#1d3b2a_0%,transparent_42%),linear-gradient(180deg,#06111d_0%,#031018_100%)]">
      <Snowfield />
      <ConstructionWatermark />

      <header className="relative z-30 flex items-start justify-between gap-3">
        <div className="relative z-30 min-w-0 shrink-0">
          <Link
            href="/"
            className="tap inline-flex items-center text-[1.55rem] leading-none font-black tracking-tight text-snow"
          >
            {BRAND.name}
          </Link>
          <AccueilMenu />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 text-center">
          <h1 className="mx-auto max-w-[16rem] font-[family-name:var(--font-fraunces)] text-[clamp(1.15rem,5.2vw,2.75rem)] leading-tight font-extrabold text-balance text-snow sm:max-w-none">
            {BRAND.community}
          </h1>
          <p className="mt-1 text-[clamp(0.75rem,2.8vw,1.05rem)] font-semibold tracking-wide text-gold">
            {BRAND.slogan}
          </p>
        </div>

        <div className="relative z-30 shrink-0">
          <ConnectWallet />
        </div>
      </header>

      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-3 py-4 text-center">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

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

      <header className="relative z-30">
        <Link
          href="/"
          className="inline-flex items-center text-[1.55rem] leading-none font-black tracking-tight text-snow"
        >
          {BRAND.name}
        </Link>

        <div className="relative mt-3 flex items-center justify-between gap-3">
          <AccueilMenu />
          <ConnectWallet />
        </div>

        <div className="mt-4 text-center">
          <h1 className="mx-auto font-[family-name:var(--font-fraunces)] text-[clamp(2.3rem,10.4vw,5.5rem)] leading-[0.95] font-extrabold text-balance text-snow">
            {BRAND.community}
          </h1>
          <p className="mt-1 text-[clamp(0.75rem,2.8vw,1.05rem)] font-semibold tracking-wide text-gold">
            {BRAND.slogan}
          </p>
        </div>
      </header>

      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-3 py-4 text-center">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

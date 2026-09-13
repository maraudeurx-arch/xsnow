import Link from "next/link";
import { type ReactNode } from "react";
import { AccueilMenu } from "@/components/AccueilMenu";
import { ConnectWallet } from "@/components/ConnectWallet";
import { ConstructionWatermark } from "@/components/ConstructionWatermark";
import { LeftMenu } from "@/components/LeftMenu";
import { SiteFooter } from "@/components/SiteFooter";
import { Snowfield } from "@/components/Snowfield";
import { BRAND } from "@/lib/content";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <div className="safe-frame relative flex min-h-dvh flex-col overflow-x-hidden bg-[radial-gradient(1200px_circle_at_20%_-10%,#16324d_0%,transparent_55%),radial-gradient(900px_circle_at_90%_10%,#1d3b2a_0%,transparent_42%),linear-gradient(180deg,#06111d_0%,#031018_100%)]">
      <Snowfield />
      <ConstructionWatermark />

      <header className="relative z-20">
        <div className="flex items-start justify-between gap-2">
          <Link
            href="/"
            className="tap relative z-20 inline-flex items-center text-[1.55rem] leading-none font-black tracking-tight text-snow"
          >
            {BRAND.name}
          </Link>
          <div className="relative z-20">
            <ConnectWallet />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-12 top-0 text-center sm:inset-x-36">
          <h1 className="font-[family-name:var(--font-fraunces)] text-[clamp(1.05rem,5.1vw,2.75rem)] leading-tight font-extrabold text-snow">
            {BRAND.community}
          </h1>
          <p className="mt-1 text-[clamp(0.7rem,2.8vw,1rem)] font-semibold tracking-wide text-gold">
            {BRAND.slogan}
          </p>
        </div>

        <LeftMenu />
      </header>

      <div className="relative z-20 mt-4 flex justify-center">
        <AccueilMenu />
      </div>

      <main className="relative z-20 flex flex-1 flex-col items-center justify-start py-6">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

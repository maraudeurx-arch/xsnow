import Link from "next/link";
import { type ReactNode } from "react";
import { ConstructionWatermark } from "@/components/ConstructionWatermark";
import { HeaderNav } from "@/components/HeaderNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Snowfield } from "@/components/Snowfield";
import { BRAND } from "@/lib/content";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <div className="safe-frame relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-[radial-gradient(1100px_circle_at_0%_-8%,rgba(61,255,138,0.16)_0%,transparent_52%),radial-gradient(900px_circle_at_100%_0%,rgba(139,92,246,0.18)_0%,transparent_48%),linear-gradient(180deg,#050506_0%,#0a0a0c_100%)]">
      <Snowfield />
      <ConstructionWatermark />

      <header className="relative z-30 shrink-0">
        <Link
          href="/"
          className="inline-flex items-center text-[1.25rem] leading-none font-black tracking-tight text-gold sm:text-[1.55rem]"
        >
          {BRAND.name}
        </Link>

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

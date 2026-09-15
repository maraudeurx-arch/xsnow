"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useNeedsConsentSheet } from "@/components/ConsentSheet";
import { useI18n } from "@/lib/i18n/locale";
import { isAndroidDevice, shouldShowInstallTip, writeInstallTipDismissed } from "@/lib/install-tip";
import { useHasHydrated } from "@/lib/useAnalyticsConsent";

export function InstallTip({ compact = false }: { compact?: boolean }) {
  return (
    <Suspense fallback={null}>
      <InstallTipInner compact={compact} />
    </Suspense>
  );
}

function InstallTipInner({ compact }: { compact: boolean }) {
  const { m } = useI18n();
  const waitingOnConsent = useNeedsConsentSheet();
  const searchParams = useSearchParams();
  const hydrated = useHasHydrated();
  const [hidden, setHidden] = useState(false);

  const visible =
    hydrated &&
    !hidden &&
    !waitingOnConsent &&
    shouldShowInstallTip({
      search: `?${searchParams.toString()}`,
    });

  if (!visible) return null;

  return (
    <aside
      className={`flex shrink-0 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] text-left ${
        compact ? "px-2 py-0.5" : "p-3"
      }`}
      role="note"
    >
      <p
        className={`min-w-0 flex-1 text-snow/90 ${
          compact ? "line-clamp-2 text-[9px] leading-snug" : "text-sm leading-relaxed"
        }`}
      >
        {isAndroidDevice() ? m.install.tipAndroid : m.install.tip}
      </p>
      <button
        type="button"
        className={`shrink-0 rounded-full border border-white/20 bg-white/5 px-2.5 text-[11px] font-bold text-snow ${
          compact ? "min-h-7 px-2 text-[10px]" : "tap"
        }`}
        onClick={() => {
          writeInstallTipDismissed();
          setHidden(true);
        }}
      >
        {m.install.dismiss}
      </button>
    </aside>
  );
}

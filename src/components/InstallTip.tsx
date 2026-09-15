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
      className={`rounded-2xl border border-white/15 bg-white/[0.05] text-left ${
        compact ? "px-2.5 py-2" : "p-3"
      }`}
      role="note"
    >
      <p
        className={`leading-relaxed text-snow/90 ${
          compact ? "text-[11px]" : "text-sm"
        }`}
      >
        {isAndroidDevice() ? m.install.tipAndroid : m.install.tip}
      </p>
      <button
        type="button"
        className={`mt-2 rounded-full border border-white/20 bg-white/5 px-3 text-[11px] font-bold text-snow ${
          compact ? "min-h-8" : "tap"
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

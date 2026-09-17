"use client";

import type { ReactNode } from "react";
import { LocalProfileBoard } from "@/components/LocalProfileBoard";
import { useI18n } from "@/lib/i18n/locale";
import { useDeviceMemoryReady } from "@/lib/useDeviceMemoryReady";
import { useLocalProfile } from "@/lib/useLocalProfile";

/** Require device-local registration (Mon profil) before a publish / earn surface. */
export function SignupGate({ children }: { children: ReactNode }) {
  const { m } = useI18n();
  const memoryReady = useDeviceMemoryReady();
  const [profile] = useLocalProfile();

  if (!profile && !memoryReady) {
    return <div data-device-memory-pending aria-busy="true" className="min-h-11" />;
  }
  if (!profile) {
    return (
      <div className="space-y-3" data-signup-gate>
        <p className="text-sm leading-relaxed text-pretty text-snow/90">{m.register.gateLead}</p>
        <LocalProfileBoard startOpen required />
      </div>
    );
  }
  return <>{children}</>;
}

"use client";

import { useI18n } from "@/lib/i18n/locale";
import { interpolate } from "@/lib/i18n";
import { headerDisplayName } from "@/lib/local-profile";
import { useHasHydrated } from "@/lib/useAnalyticsConsent";
import { useLocalProfile } from "@/lib/useLocalProfile";

/** Compact label next to the Open Community logo. Never email or phone. */
export function HeaderProfileLabel() {
  const hydrated = useHasHydrated();
  const { m } = useI18n();
  const [profile] = useLocalProfile();
  if (!hydrated || !profile) return null;
  const label = headerDisplayName(profile);
  if (!label) return null;
  return (
    <span
      data-header-profile
      title={profile.id}
      aria-label={interpolate(m.register.headerAria, { name: label })}
      className="max-w-[4.8rem] truncate text-right text-[10px] font-extrabold leading-none tracking-tight text-snow [text-shadow:0_2px_10px_rgba(0,0,0,0.55)] sm:max-w-[7.5rem] sm:text-xs"
    >
      {label}
    </span>
  );
}

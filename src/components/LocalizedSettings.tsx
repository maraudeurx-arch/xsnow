"use client";

import { LanguageSwitch } from "@/components/LanguageSwitch";
import { LocalizedProfileStub } from "@/components/LocalizedFeature";
import { useI18n } from "@/lib/i18n/locale";

export function LocalizedSettings() {
  const { m } = useI18n();
  return (
    <LocalizedProfileStub feature="reglages">
      <LanguageSwitch />
      <p className="mt-4 text-sm leading-relaxed text-ice/85">{m.profile.comingSoon}</p>
    </LocalizedProfileStub>
  );
}

"use client";

import { useI18n } from "@/lib/i18n/locale";

/** Soft-launch honesty: device-local profile data, never sold or reused outside OPC. */
export function InfosPrivacyNote() {
  const { m } = useI18n();
  return (
    <p
      data-infos-privacy
      className="rounded-xl border border-gold/35 bg-gold/10 px-3 py-2 text-sm leading-relaxed text-pretty text-snow/90"
      role="note"
    >
      {m.profile.infosPrivacy}
    </p>
  );
}

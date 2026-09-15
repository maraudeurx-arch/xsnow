"use client";

import { APP_VERSION } from "@/lib/app-version";
import { useI18n } from "@/lib/i18n/locale";

export function AppVersionNote({ showReleaseNotes = true }: { showReleaseNotes?: boolean }) {
  const { m } = useI18n();
  return (
    <div className="space-y-3">
      <p className="text-xs font-extrabold tracking-[0.14em] text-gold uppercase">
        {m.profile.versionLabel} {APP_VERSION}
      </p>
      <p className="text-sm leading-relaxed text-ice/85">{m.profile.deviceLocalNote}</p>
      {showReleaseNotes ? (
        <section>
          <h3 className="text-sm font-extrabold text-snow">{m.profile.releaseNotesTitle}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ice/85">{m.profile.releaseNotesBody}</p>
        </section>
      ) : null}
    </div>
  );
}

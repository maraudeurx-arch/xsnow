"use client";

import { useI18n } from "@/lib/i18n/locale";

export function InstallGuide() {
  const { m } = useI18n();
  const copy = m.install;

  return (
    <section
      data-install-guide
      aria-labelledby="install-guide-title"
      className="rounded-2xl border border-sky-400/35 bg-sky-500/10 p-3 text-left"
    >
      <h3 id="install-guide-title" className="text-sm font-extrabold text-snow">
        {copy.profileTitle}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-snow/85">{copy.profileLead}</p>
      <p className="mt-2 text-xs font-extrabold text-gold">{copy.iphoneHeading}</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-snow/90">
        {copy.iphoneSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs leading-relaxed text-ice/80">{copy.tipAndroid}</p>
    </section>
  );
}

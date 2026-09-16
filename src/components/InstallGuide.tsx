"use client";

import { useI18n } from "@/lib/i18n/locale";
import { PUBLIC_SITE_URL } from "@/lib/paths";

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
      <p className="mt-2 text-xs font-extrabold leading-snug text-gold">
        {copy.siteUrlLabel}
      </p>
      <a
        href={PUBLIC_SITE_URL}
        data-install-url
        className="mt-1.5 block break-all rounded-lg border border-gold/40 bg-black/25 px-2 py-1.5 font-mono text-[11px] font-bold leading-snug text-gold underline-offset-2 hover:underline"
      >
        {PUBLIC_SITE_URL}
      </a>
      <p className="mt-2 text-xs font-extrabold text-gold">{copy.iphoneHeading}</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-snow/90">
        {copy.iphoneSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs leading-relaxed text-ice/80">{copy.tipAndroid}</p>
      <p
        data-install-wrong-shortcut
        className="mt-2 text-xs leading-relaxed text-snow/75"
      >
        {copy.wrongShortcut}
      </p>
    </section>
  );
}

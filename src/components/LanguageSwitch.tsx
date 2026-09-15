"use client";

import { LOCALES } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";

export function LanguageSwitch() {
  const { locale, m, setLocale, source } = useI18n();

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-snow">{m.profile.language}</p>
      <div className="flex flex-wrap gap-2">
        {LOCALES.map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={active}
              className={`tap rounded-full px-4 text-sm font-extrabold ${
                active ? "bg-gold text-night" : "border border-white/15 bg-white/5 text-snow"
              }`}
              onClick={() => setLocale(code)}
            >
              {m.settings.languages[code]}
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-ice/80">
        {source === "query" ? `${m.profile.reglagesHint} (?lang=${locale})` : m.profile.reglagesHint}
      </p>
    </div>
  );
}

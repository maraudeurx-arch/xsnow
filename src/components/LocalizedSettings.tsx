"use client";

import { LanguageSwitch } from "@/components/LanguageSwitch";
import { LegalLinks } from "@/components/LegalLinks";
import { LocalizedProfileStub } from "@/components/LocalizedFeature";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";
import { useAnalyticsConsent } from "@/lib/useAnalyticsConsent";

function ConsentSwitch({
  checked,
  onChange,
  label,
  hint,
  enabledLabel,
  disabledLabel,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
  enabledLabel: string;
  disabledLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="min-w-0 text-left">
        <p className="text-sm font-semibold text-snow">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-ice/80">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`tap shrink-0 rounded-full px-3 text-xs font-extrabold disabled:opacity-60 ${
          checked ? "bg-gold text-night" : "border border-white/15 bg-white/5 text-snow"
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked ? enabledLabel : disabledLabel}
      </button>
    </div>
  );
}

export function LocalizedSettings() {
  const { m } = useI18n();
  const { consent, locating, requestLocation, skipLocation } = usePlace();
  const { granted: analyticsOn, setConsent } = useAnalyticsConsent();

  return (
    <LocalizedProfileStub feature="reglages">
      <LanguageSwitch />
      <div className="mt-4 space-y-2">
        <ConsentSwitch
          checked={consent === "granted"}
          disabled={locating}
          label={m.profile.locationConsent}
          hint={m.profile.locationHint}
          enabledLabel={m.profile.enabled}
          disabledLabel={m.profile.disabled}
          onChange={(next) => {
            if (next) requestLocation();
            else skipLocation();
          }}
        />
        <ConsentSwitch
          checked={analyticsOn}
          label={m.profile.analyticsConsent}
          hint={m.profile.analyticsHint}
          enabledLabel={m.profile.enabled}
          disabledLabel={m.profile.disabled}
          onChange={(next) => setConsent(next ? "granted" : "denied")}
        />
      </div>
      <LegalLinks className="mt-4 text-sm" />
      <p className="mt-4 text-sm leading-relaxed text-ice/85">{m.profile.comingSoon}</p>
    </LocalizedProfileStub>
  );
}

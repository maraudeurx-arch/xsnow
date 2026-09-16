"use client";

import { AppVersionNote } from "@/components/AppVersionNote";
import { InfosPrivacyNote } from "@/components/InfosPrivacyNote";
import { LegalLinks } from "@/components/LegalLinks";
import { LegalSections } from "@/components/LocalizedLegal";
import { LocalizedProfileStub } from "@/components/LocalizedFeature";
import { TrustContact } from "@/components/TrustContact";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";

export function LocalizedAbout() {
  const { m } = useI18n();
  const { placeName } = usePlace();
  return (
    <LocalizedProfileStub feature="aPropos">
      <div className="grid gap-3">
        <InfosPrivacyNote />
        <AppVersionNote />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ice/85">
        {interpolate(m.profile.aProposBody, {
          placeName,
          community: m.brand.community,
          slogan: m.brand.slogan,
        })}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ice/85">{m.legal.about.extra}</p>
      <LegalSections sections={m.legal.about.sections} />
      <TrustContact />
      <LegalLinks className="mt-4 block text-sm" />
    </LocalizedProfileStub>
  );
}

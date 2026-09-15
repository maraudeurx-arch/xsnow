"use client";

import { LocalizedProfileStub } from "@/components/LocalizedFeature";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";

export function LocalizedAbout() {
  const { m } = useI18n();
  const { placeName } = usePlace();
  return (
    <LocalizedProfileStub feature="aPropos">
      <p className="text-sm leading-relaxed text-ice/85">
        {interpolate(m.profile.aProposBody, {
          placeName,
          community: m.brand.community,
          slogan: m.brand.slogan,
        })}
      </p>
    </LocalizedProfileStub>
  );
}

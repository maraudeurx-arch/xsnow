"use client";

import type { ReactNode } from "react";
import { FeaturePanel } from "@/components/FeaturePanel";
import { ProfileStub } from "@/components/ProfileStub";
import { useI18n } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n";

export function LocalizedFeature({
  feature,
  children,
}: {
  feature: keyof Messages["features"];
  children: ReactNode;
}) {
  const { m } = useI18n();
  const copy = m.features[feature];
  return (
    <FeaturePanel title={copy.title} lead={copy.lead}>
      {children}
    </FeaturePanel>
  );
}

export function LocalizedProfileStub({
  feature,
  children,
}: {
  feature: keyof Messages["features"];
  children?: ReactNode;
}) {
  const { m } = useI18n();
  const copy = m.features[feature];
  return (
    <ProfileStub title={copy.title} lead={copy.lead}>
      {children}
    </ProfileStub>
  );
}

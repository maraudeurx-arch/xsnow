"use client";

import type { ReactNode } from "react";
import { FeaturePanel } from "@/components/FeaturePanel";
import { ProfileStub } from "@/components/ProfileStub";
import { useI18n } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n";

export function LocalizedFeature({
  feature,
  children,
  compact = false,
}: {
  feature: keyof Messages["features"];
  children: ReactNode;
  compact?: boolean;
}) {
  const { m } = useI18n();
  const copy = m.features[feature];
  return (
    <FeaturePanel title={copy.title} lead={copy.lead} compact={compact}>
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
    <ProfileStub title={copy.title} lead={copy.lead} backLabel={m.nav.monProfil}>
      {children}
    </ProfileStub>
  );
}

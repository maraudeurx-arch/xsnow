"use client";

import { FeaturePanel } from "@/components/FeaturePanel";
import { ServiceBoard } from "@/components/features/ServiceBoard";
import { useI18n } from "@/lib/i18n/locale";
import type { ServiceKind } from "@/lib/services";

export function LocalizedService({ kind }: { kind: ServiceKind }) {
  const { m } = useI18n();
  const copy = m.services[kind];
  return (
    <FeaturePanel title={copy.title} lead={copy.lead}>
      <ServiceBoard kind={kind} />
    </FeaturePanel>
  );
}

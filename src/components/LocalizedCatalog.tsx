"use client";

import { CatalogBoard } from "@/components/features/CatalogBoard";
import { LocalizedFeature } from "@/components/LocalizedFeature";
import { useI18n } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n";

export function LocalizedCatalog({
  feature,
}: {
  feature: "reportage" | "series" | "dessins";
}) {
  const { m } = useI18n();
  const items = m.catalogs[feature] as Messages["catalogs"][typeof feature];
  return (
    <LocalizedFeature feature={feature}>
      <CatalogBoard items={[...items]} />
    </LocalizedFeature>
  );
}

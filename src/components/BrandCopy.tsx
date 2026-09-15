"use client";

import { useI18n } from "@/lib/i18n/locale";

export function BrandCopy({ field }: { field: "community" | "slogan" }) {
  const { m } = useI18n();
  return <>{m.brand[field]}</>;
}

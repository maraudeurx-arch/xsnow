"use client";

import type { ReactNode } from "react";
import { LocalizedFeature, LocalizedProfileStub } from "@/components/LocalizedFeature";
import { useI18n } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n";

export function StubBody({ k }: { k: keyof Messages["stubs"] }) {
  const { m } = useI18n();
  return <p className="text-sm leading-relaxed text-ice/85">{m.stubs[k]}</p>;
}

export function LocalizedStubFeature({
  feature,
  stub,
}: {
  feature: keyof Messages["features"];
  stub: keyof Messages["stubs"];
}) {
  return (
    <LocalizedFeature feature={feature}>
      <StubBody k={stub} />
    </LocalizedFeature>
  );
}

export function LocalizedStubProfile({
  feature,
  stub,
  children,
}: {
  feature: keyof Messages["features"];
  stub: keyof Messages["stubs"];
  children?: ReactNode;
}) {
  return (
    <LocalizedProfileStub feature={feature}>
      <StubBody k={stub} />
      {children}
    </LocalizedProfileStub>
  );
}

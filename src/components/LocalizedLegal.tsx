"use client";

import { AppVersionNote } from "@/components/AppVersionNote";
import { FeaturePanel } from "@/components/FeaturePanel";
import { InfosPrivacyNote } from "@/components/InfosPrivacyNote";
import { LegalLinks } from "@/components/LegalLinks";
import { TrustContact } from "@/components/TrustContact";
import { useI18n } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n";

export type LegalKind = keyof Messages["legal"];

export function LegalSections({
  sections,
}: {
  sections: { heading: string; body: string }[];
}) {
  return (
    <div className="mt-4 space-y-4">
      {sections.map((section) => (
        <section key={section.heading}>
          <h3 className="text-sm font-extrabold text-snow">{section.heading}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ice/85">{section.body}</p>
        </section>
      ))}
    </div>
  );
}

export function LocalizedLegal({ kind }: { kind: LegalKind }) {
  const { m } = useI18n();
  const copy = m.legal[kind];
  const extra = "extra" in copy ? copy.extra : undefined;

  return (
    <FeaturePanel title={copy.title} lead={copy.lead}>
      {kind === "about" ? (
        <div className="mb-3">
          <InfosPrivacyNote />
        </div>
      ) : null}
      <p className="rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-[12px] leading-snug text-snow/90">
        {copy.draft}
      </p>
      <p className="mt-3 text-[11px] text-ice/70">{copy.updated}</p>
      {kind === "about" ? (
        <div className="mt-4">
          <AppVersionNote />
        </div>
      ) : null}
      {extra ? <p className="mt-4 text-[13px] leading-relaxed text-ice/85">{extra}</p> : null}
      <LegalSections sections={copy.sections} />
      <TrustContact showSecurityPolicy={kind === "security"} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <LegalLinks className="text-sm" />
      </div>
    </FeaturePanel>
  );
}

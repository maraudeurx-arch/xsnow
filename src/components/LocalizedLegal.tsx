"use client";

import { FeaturePanel } from "@/components/FeaturePanel";
import { LegalLinks } from "@/components/LegalLinks";
import { useI18n } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n";

export function LocalizedLegal({ kind }: { kind: "privacy" | "terms" }) {
  const { m } = useI18n();
  const copy: Messages["legal"]["privacy"] = m.legal[kind];

  return (
    <FeaturePanel title={copy.title} lead={copy.lead}>
      <p className="rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-[12px] leading-snug text-snow/90">
        {copy.draft}
      </p>
      <p className="mt-3 text-[11px] text-ice/70">{copy.updated}</p>
      <div className="mt-4 space-y-4">
        {copy.sections.map((section) => (
          <section key={section.heading}>
            <h3 className="text-sm font-extrabold text-snow">{section.heading}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ice/85">{section.body}</p>
          </section>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <LegalLinks className="text-sm" />
      </div>
    </FeaturePanel>
  );
}

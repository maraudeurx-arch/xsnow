"use client";

import { FeaturePanel } from "@/components/FeaturePanel";
import { useI18n } from "@/lib/i18n/locale";
import { getTutoratCopy } from "@/lib/tutorat/messages";

export function TutoratPreview() {
  const { locale } = useI18n();
  const copy = getTutoratCopy(locale);

  return (
    <div data-tutorat-preview lang={locale} className="flex w-full justify-center">
      <FeaturePanel title={copy.title} lead={copy.lead}>
        <p className="inline-block rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
          {copy.badge}
        </p>
        <p className="mt-3 text-sm font-bold">{copy.adultsOnly}</p>
        <div className="mt-5 space-y-4">
          {copy.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="text-sm font-extrabold">{section.heading}</h3>
              <p className="mt-1 text-[13px] leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </FeaturePanel>
    </div>
  );
}

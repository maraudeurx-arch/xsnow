"use client";

import { FeaturePanel } from "@/components/FeaturePanel";
import { LegalLinks } from "@/components/LegalLinks";
import { TrustContact } from "@/components/TrustContact";
import { useI18n } from "@/lib/i18n/locale";
import { CHARTER_PDF_PATH, assetUrl } from "@/lib/paths";

export function LocalizedCharter() {
  const { m } = useI18n();
  const copy = m.charter;

  return (
    <FeaturePanel title={copy.title} lead={copy.lead}>
      <p className="rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-[12px] leading-snug text-snow/90">
        {copy.brand}
      </p>
      <p className="mt-3 text-[11px] text-ice/70">{copy.version}</p>
      {copy.meta.length > 0 ? (
        <div className="mt-3 space-y-1">
          {copy.meta.map((line) => (
            <p key={line} className="text-[12px] leading-snug text-ice/80">
              {line}
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-4">
        <a
          href={assetUrl(CHARTER_PDF_PATH)}
          download
          className="inline-block rounded-full bg-gold px-4 py-2 text-sm font-extrabold text-slate-900 hover:underline"
        >
          {copy.pdfLabel}
        </a>
      </div>
      {copy.nature.length > 0 ? (
        <section className="mt-5 text-left">
          <h3 className="text-sm font-extrabold text-snow">{copy.natureHeading}</h3>
          {copy.nature.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="mt-1 text-[13px] leading-relaxed text-ice/85">
              {paragraph}
            </p>
          ))}
        </section>
      ) : null}
      {copy.preamble.length > 0 ? (
        <section className="mt-5 text-left">
          <h3 className="text-sm font-extrabold text-snow">{copy.preambleHeading}</h3>
          {copy.preamble.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="mt-1 text-[13px] leading-relaxed text-ice/85">
              {paragraph}
            </p>
          ))}
        </section>
      ) : null}
      <div className="mt-2 text-left">
        {copy.articles.map((article) => (
          <section key={article.heading} className="mt-4">
            <h3 className="text-sm font-extrabold text-snow">{article.heading}</h3>
            {article.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 48)}
                className="mt-1 text-[13px] leading-relaxed text-ice/85"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
      {copy.sources.length > 0 ? (
        <section className="mt-5 text-left">
          <h3 className="text-sm font-extrabold text-snow">{copy.sourcesHeading}</h3>
          <ul className="mt-1 space-y-1">
            {copy.sources.map((source) => (
              <li key={source.url} className="text-[13px] leading-relaxed">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-gold hover:underline"
                >
                  {source.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-5 rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-left text-[12px] leading-snug text-snow/90">
        {copy.formNote}
      </p>
      {copy.colophon ? (
        <p className="mt-4 text-[11px] leading-snug text-ice/70">{copy.colophon}</p>
      ) : null}
      <TrustContact />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <LegalLinks className="text-sm" />
      </div>
    </FeaturePanel>
  );
}

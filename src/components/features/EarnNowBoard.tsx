"use client";

import { useEffect, useId, useState } from "react";
import { PAID_MISSION_LINKS } from "@/lib/paid-missions";
import { ONLINE_WORK_LINKS } from "@/lib/online-work";
import { useI18n } from "@/lib/i18n/locale";

const ctaClass =
  "tap inline-flex min-h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3.5 text-left text-[15px] font-bold text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.05)]";

const sectionTitleClass =
  "text-left text-lg font-extrabold tracking-tight text-slate-900";

const sectionLeadClass = "text-left text-sm leading-snug text-slate-600";

export function EarnNowBoard() {
  const { m } = useI18n();
  const copy = m.earnNow;
  const [supportOpen, setSupportOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!supportOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSupportOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [supportOpen]);

  return (
    <div className="grid gap-3">
      <section className="grid gap-1.5" aria-labelledby="earn-online-title">
        <h2 id="earn-online-title" className={sectionTitleClass}>
          {copy.onlineWorkTitle}
        </h2>
        {copy.onlineWorkLead ? (
          <p className={sectionLeadClass}>{copy.onlineWorkLead}</p>
        ) : null}
        {ONLINE_WORK_LINKS.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClass}
          >
            {link.label}
          </a>
        ))}
      </section>

      <section className="grid gap-1.5" aria-labelledby="earn-missions-title">
        <h2 id="earn-missions-title" className={sectionTitleClass}>
          {copy.missionsTitle}
        </h2>
        {copy.missionsLead ? (
          <p className={sectionLeadClass}>{copy.missionsLead}</p>
        ) : null}
        {PAID_MISSION_LINKS.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClass}
          >
            {link.label}
          </a>
        ))}
      </section>

      <section className="grid gap-1.5" aria-labelledby="earn-support-title">
        <h2 id="earn-support-title" className={sectionTitleClass}>
          {copy.supportTitle}
        </h2>
        {copy.supportLead ? (
          <p className={sectionLeadClass}>{copy.supportLead}</p>
        ) : null}
        <button
          type="button"
          className={ctaClass}
          data-earn-support-cta
          onClick={() => setSupportOpen(true)}
        >
          {copy.supportCta}
        </button>
      </section>

      {copy.disclaimer ? (
        <p
          data-earn-disclaimer
          className="rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-left text-sm leading-snug text-slate-700"
        >
          {copy.disclaimer}
        </p>
      ) : null}

      {supportOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
          onClick={() => setSupportOpen(false)}
        >
          <section
            className="opc-glass-menu w-full max-w-md rounded-2xl p-4 text-left"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-earn-support-dialog
            onClick={(event) => event.stopPropagation()}
          >
            <p id={titleId} className="text-[14px] font-extrabold tracking-wide text-snow">
              {copy.supportDialogTitle}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-snow/90">
              {copy.supportDialogBody}
            </p>
            <button
              type="button"
              className={`${ctaClass} mt-4`}
              onClick={() => setSupportOpen(false)}
            >
              {copy.supportDialogClose}
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { PAID_MISSION_LINKS } from "@/lib/paid-missions";
import { ONLINE_WORK_LINKS } from "@/lib/online-work";
import { useI18n } from "@/lib/i18n/locale";

const ctaClass =
  "tap inline-flex min-h-10 w-full items-center justify-center rounded-full border border-gold/65 bg-cobalt px-3 text-center text-[13px] font-extrabold text-snow";

const sectionTitleClass =
  "text-left text-[12px] font-extrabold uppercase tracking-wide text-snow/90";

const sectionLeadClass = "text-left text-[11px] leading-snug text-snow/75";

export function EarnNowBoard() {
  const { m } = useI18n();
  const copy = m.earnNow;

  return (
    <div className="grid gap-3">
      <section className="grid gap-1.5" aria-labelledby="earn-missions-title">
        <h2 id="earn-missions-title" className={sectionTitleClass}>
          {copy.missionsTitle}
        </h2>
        <p className={sectionLeadClass}>{copy.missionsLead}</p>
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

      <section className="grid gap-1.5" aria-labelledby="earn-online-title">
        <h2 id="earn-online-title" className={sectionTitleClass}>
          {copy.onlineWorkTitle}
        </h2>
        <p className={sectionLeadClass}>{copy.onlineWorkLead}</p>
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
    </div>
  );
}

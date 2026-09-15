"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/locale";
import { MICRO1_APPLY_URL, PROLIFIC_URL, USERTESTING_URL } from "@/lib/paid-missions";

const cardClass =
  "space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.28)]";
const ctaClass =
  "tap inline-flex min-h-11 w-full items-center justify-center rounded-full px-3 text-center text-sm font-extrabold";
const ghostCtaClass = `${ctaClass} border border-gold/45 bg-gold/10 text-gold`;
const solidCtaClass = `${ctaClass} bg-cobalt text-snow`;

export function EarnNowBoard() {
  const { m } = useI18n();
  const copy = m.gagner;

  return (
    <div className="space-y-4">
      <p
        role="note"
        className="rounded-2xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm leading-relaxed font-semibold text-gold"
      >
        {copy.antiPattern}
      </p>

      <article className={cardClass}>
        <p className="text-[10px] font-extrabold tracking-[0.14em] text-gold uppercase">1</p>
        <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-extrabold text-snow">
          {copy.neighborsTitle}
        </h3>
        <p className="text-sm leading-relaxed text-ice/90">{copy.neighborsBody}</p>
        <div className="grid gap-2">
          <Link href="/mes-services" className={solidCtaClass}>
            {copy.neighborsCtaServices}
          </Link>
          <Link href="/en-demande" className={ghostCtaClass}>
            {copy.neighborsCtaDemand}
          </Link>
          <Link href="/en-demande/?kind=car-morning" className={ghostCtaClass}>
            {copy.neighborsCtaCar}
          </Link>
        </div>
      </article>

      <article className={cardClass}>
        <p className="text-[10px] font-extrabold tracking-[0.14em] text-gold uppercase">2</p>
        <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-extrabold text-snow">
          {copy.missionsTitle}
        </h3>
        <p className="text-sm leading-relaxed text-ice/90">{copy.missionsBody}</p>
        <p className="text-xs font-extrabold tracking-wide text-gold uppercase">
          {copy.missionsExamplesTitle}
        </p>
        <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-snow/85">
          <li>{copy.missionsExample1}</li>
          <li>{copy.missionsExample2}</li>
          <li>{copy.missionsExample3}</li>
        </ul>
        <div className="space-y-2 rounded-xl border border-gold/35 bg-gold/5 p-3">
          <h4 className="text-base font-extrabold text-snow">{copy.missionsMicro1Title}</h4>
          <p className="text-sm leading-relaxed text-ice/90">{copy.missionsMicro1Body}</p>
          <p role="note" className="text-xs font-semibold leading-relaxed text-gold">
            {copy.missionsMicro1Disclaimer}
          </p>
          <a
            href={MICRO1_APPLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={ghostCtaClass}
          >
            {copy.missionsMicro1Cta}
          </a>
        </div>
        <div className="grid gap-2">
          <a
            href={USERTESTING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={ghostCtaClass}
          >
            {copy.missionsUserTesting}
          </a>
          <a
            href={PROLIFIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={ghostCtaClass}
          >
            {copy.missionsProlific}
          </a>
          <Link href="/sondages" className={`${ctaClass} border border-white/15 bg-white/5 text-snow`}>
            {copy.missionsLocal}
          </Link>
        </div>
        <p className="text-xs leading-relaxed text-snow/55">{copy.missionsExternalHint}</p>
        <p className="text-xs font-semibold text-gold/90">{copy.missionsSoon}</p>
      </article>

      <article className={cardClass}>
        <p className="text-[10px] font-extrabold tracking-[0.14em] text-gold uppercase">3</p>
        <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-extrabold text-snow">
          {copy.timeTitle}
        </h3>
        <p className="text-sm leading-relaxed text-ice/90">{copy.timeBody}</p>
        <p className="text-sm font-semibold leading-relaxed text-gold">{copy.timeWarn}</p>
        <div className="grid gap-2">
          <Link href="/mes-services" className={solidCtaClass}>
            {copy.timeCta}
          </Link>
          <Link href="/mes-services/?template=hotspot" className={ghostCtaClass}>
            {copy.timeHotspot}
          </Link>
          <Link href="/mes-services/?template=ux" className={ghostCtaClass}>
            {copy.timeUx}
          </Link>
        </div>
      </article>

      <p className="text-[11px] leading-relaxed text-snow/50">{copy.bandwidthNote}</p>
    </div>
  );
}

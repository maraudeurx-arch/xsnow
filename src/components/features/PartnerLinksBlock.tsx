"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/locale";
import {
  PARTNER_LINKS,
  partnerLinkHref,
  readHitlPoolOptIn,
  subscribeHitlPoolOptIn,
  writeHitlPoolOptIn,
} from "@/lib/partner-links";

const ctaClass =
  "tap inline-flex min-h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3.5 text-left text-[15px] font-bold text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.05)]";

/**
 * Draft « Liens partenaires » block. Rendered only behind
 * NEXT_PUBLIC_PARTNER_LINKS=1 (see EarnNowBoard). The opt-in stays on this
 * device; nothing is sent.
 */
export function PartnerLinksBlock() {
  const { m } = useI18n();
  const copy = m.earnNow.partners;
  const checkboxId = useId();
  const consentId = useId();
  // Unchecked by default; server render is always unchecked.
  const optedIn = useSyncExternalStore(
    subscribeHitlPoolOptIn,
    () => readHitlPoolOptIn() !== null,
    () => false,
  );
  const [saved, setSaved] = useState(false);

  const bodies: Record<string, { body: string; apply: string }> = {
    mercor: { body: copy.mercorBody, apply: copy.applyMercor },
    micro1: { body: copy.micro1Body, apply: copy.applyMicro1 },
  };

  return (
    <section
      className="grid gap-1.5"
      aria-labelledby="earn-partners-title"
      data-earn-partner-links
    >
      <h2 id="earn-partners-title" className="text-left text-lg font-extrabold tracking-tight text-slate-900">
        {copy.title}
      </h2>
      <p className="text-left text-sm leading-snug text-slate-600">{copy.lead}</p>

      {PARTNER_LINKS.map((link) => {
        const href = partnerLinkHref(link);
        const text = bodies[link.id];
        return (
          <div key={link.id} className="grid gap-1" data-partner-link={link.id}>
            <p className="text-left text-sm leading-snug text-slate-700">
              <strong>{link.label}</strong> — {text.body}
            </p>
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer sponsored" className={ctaClass}>
                {text.apply}
                <span className="text-xs font-semibold italic text-slate-500">{copy.partnerTag}</span>
              </a>
            ) : (
              <p className="text-left text-sm italic text-slate-500" data-partner-link-pending>
                {text.apply} · {copy.linkPending}
              </p>
            )}
          </div>
        );
      })}

      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left">
        <h3 className="text-sm font-extrabold text-slate-900">{copy.knowTitle}</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-snug text-slate-700">
          {copy.knowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm italic text-slate-600">{copy.contact}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left">
        <div className="flex items-start gap-2">
          <input
            id={checkboxId}
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0"
            checked={optedIn}
            aria-describedby={consentId}
            data-hitl-pool-optin
            onChange={(event) => {
              writeHitlPoolOptIn(event.target.checked);
              setSaved(true);
            }}
          />
          <label htmlFor={checkboxId} className="text-sm font-bold leading-snug text-slate-900">
            {copy.poolOptInLabel}
          </label>
        </div>
        <p id={consentId} className="mt-1 text-xs leading-snug text-slate-600">
          {copy.poolConsent}
        </p>
        {saved ? (
          <p className="mt-1 text-xs font-semibold text-slate-700" role="status">
            {copy.poolSaved}
          </p>
        ) : null}
      </div>
    </section>
  );
}

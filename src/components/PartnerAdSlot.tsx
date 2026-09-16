"use client";

import { useI18n } from "@/lib/i18n/locale";
import {
  adsenseClientId,
  adsenseSlotId,
  usesAdsense,
  type PartnerSlotId,
} from "@/lib/partner-ads";

const SLOT_MIN_H: Record<PartnerSlotId, string> = {
  "news-mid": "min-h-[4.4rem]",
  "news-bottom": "min-h-[5.8rem]",
};

export function PartnerAdSlot({ slot }: { slot: PartnerSlotId }) {
  const { m } = useI18n();
  const copy = m.neighborhoodNews;
  const adsense = usesAdsense(slot);
  const client = adsenseClientId();
  const unit = adsenseSlotId(slot);

  return (
    <aside
      data-partner-slot={slot}
      aria-label={`${copy.partnerSponsored} — ${copy.partnerSlot}`}
      className={`flex min-h-0 flex-1 flex-col rounded-lg border border-dashed border-gold/35 bg-white/[0.03] px-2 py-1.5 text-left ${SLOT_MIN_H[slot]}`}
    >
      <p className="shrink-0 text-[8px] font-extrabold uppercase tracking-wide text-ice/70">
        {copy.partnerSponsored}
        <span aria-hidden> · </span>
        {copy.partnerSlot}
      </p>
      {adsense ? (
        <ins
          className="adsbygoogle mt-1 block min-h-0 flex-1"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={unit}
          data-ad-format="rectangle"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="mt-1 flex min-h-0 flex-1 flex-col items-center justify-center rounded-md border border-white/10 bg-night/40 px-2 py-1.5 text-center">
          <p className="text-[10px] leading-snug text-snow/80">{copy.partnerPlaceholder}</p>
          <p className="mt-0.5 text-[8px] leading-snug text-ice/60">{copy.partnerFunding}</p>
        </div>
      )}
    </aside>
  );
}

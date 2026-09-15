"use client";

import { useState } from "react";
import { noteFeedback } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n/locale";
import { useAnalyticsConsent, useHasHydrated } from "@/lib/useAnalyticsConsent";

const FEEDBACK_KEY_PREFIX = "xsnow.feedback:";

function readDone(surface: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(`${FEEDBACK_KEY_PREFIX}${surface}`) === "1";
  } catch {
    return false;
  }
}

function writeDone(surface: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${FEEDBACK_KEY_PREFIX}${surface}`, "1");
  } catch {
    // ignore
  }
}

export function FeedbackRow({
  surface,
  compact = false,
}: {
  surface: string;
  compact?: boolean;
}) {
  const { m } = useI18n();
  const copy = m.feedback;
  const hydrated = useHasHydrated();
  const { granted } = useAnalyticsConsent();
  const [choice, setChoice] = useState<"pos" | "neg" | "">("");
  const done = hydrated && (choice || readDone(surface));

  function pick(kind: "pos" | "neg") {
    if (readDone(surface) || choice) return;
    setChoice(kind);
    writeDone(surface);
    noteFeedback(kind, surface);
  }

  if (!hydrated) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${
        compact
          ? "mt-0 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5"
          : "rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-2"
      }`}
    >
      <p className={`mr-auto font-semibold text-snow/80 ${compact ? "text-[9px]" : "text-[11px]"}`}>
        {copy.prompt}
      </p>
      {done ? (
        <p className={`font-extrabold text-gold ${compact ? "text-[10px]" : "text-[11px]"}`}>
          {copy.thanks}
        </p>
      ) : (
        <>
          <button
            type="button"
            className={`rounded-full border border-gold/45 bg-gold/10 font-extrabold text-gold ${
              compact ? "min-h-7 min-w-7 px-1.5 text-[9px]" : "tap min-h-11 min-w-11 px-3 text-[12px]"
            }`}
            onClick={() => pick("pos")}
          >
            {copy.useful}
          </button>
          <button
            type="button"
            className={`rounded-full border border-white/20 bg-white/5 font-bold text-snow ${
              compact ? "min-h-7 min-w-7 px-1.5 text-[9px]" : "tap min-h-11 min-w-11 px-3 text-[12px]"
            }`}
            onClick={() => pick("neg")}
          >
            {copy.notUseful}
          </button>
        </>
      )}
      {!granted && !compact ? (
        <p className="basis-full text-[10px] leading-snug text-snow/45">{copy.localOnly}</p>
      ) : null}
    </div>
  );
}

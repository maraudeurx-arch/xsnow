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

export function FeedbackRow({ surface }: { surface: string }) {
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
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
      <p className="mr-auto text-[11px] font-semibold text-snow/80">{copy.prompt}</p>
      {done ? (
        <p className="text-[11px] font-extrabold text-gold">{copy.thanks}</p>
      ) : (
        <>
          <button
            type="button"
            className="tap min-h-11 min-w-11 rounded-full border border-gold/45 bg-gold/10 px-3 text-[12px] font-extrabold text-gold"
            onClick={() => pick("pos")}
          >
            {copy.useful}
          </button>
          <button
            type="button"
            className="tap min-h-11 min-w-11 rounded-full border border-white/20 bg-white/5 px-3 text-[12px] font-bold text-snow"
            onClick={() => pick("neg")}
          >
            {copy.notUseful}
          </button>
        </>
      )}
      {!granted ? (
        <p className="basis-full text-[10px] leading-snug text-snow/45">{copy.localOnly}</p>
      ) : null}
    </div>
  );
}

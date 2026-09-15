"use client";

import { useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import {
  defaultShareBlurb,
  publicInviteUrl,
  readOrCreateShareCode,
} from "@/lib/invite";
import { copyText, clipShareText } from "@/lib/offers";
import { SHARE_TEXT_MAX } from "@/lib/sanitize";
import { useHasHydrated } from "@/lib/useAnalyticsConsent";

const fieldClass =
  "tap w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-normal text-snow outline-none focus:border-gold";

export function InviteShareBoard({ compact = false }: { compact?: boolean }) {
  const { locale, m } = useI18n();
  const copy = m.shareOpc;
  const hydrated = useHasHydrated();
  const code = hydrated ? readOrCreateShareCode() : "opc";
  const url = publicInviteUrl(code);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"ok" | "fail" | "">("");
  const area = useRef<HTMLTextAreaElement | null>(null);
  const seeded = useMemo(() => defaultShareBlurb(url, locale), [locale, url]);
  const value = text || seeded;

  async function copyShare() {
    const ok = await copyText(clipShareText(value));
    setStatus(ok ? "ok" : "fail");
  }

  return (
    <section className={compact ? "space-y-2" : "space-y-3 rounded-2xl border border-gold/30 bg-gold/5 p-3"}>
      <p className="text-sm font-extrabold text-gold">{copy.title}</p>
      <p className="text-xs leading-relaxed text-snow/80">{copy.hint}</p>
      <p className="break-all rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-snow">
        {url}
      </p>
      <textarea
        ref={area}
        value={value}
        onChange={(event) => setText(event.target.value.slice(0, SHARE_TEXT_MAX))}
        rows={compact ? 4 : 5}
        maxLength={SHARE_TEXT_MAX}
        className={`${fieldClass} min-h-[96px] text-xs leading-relaxed`}
        aria-label={copy.title}
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="tap rounded-full border border-white/20 bg-white/5 text-sm font-bold"
          onClick={() => {
            area.current?.focus();
            area.current?.select();
          }}
        >
          {copy.edit}
        </button>
        <button
          type="button"
          className="tap rounded-full bg-gold text-sm font-extrabold text-night"
          onClick={() => void copyShare()}
        >
          {copy.copy}
        </button>
      </div>
      {status === "ok" ? <p className="text-xs font-semibold text-gold">{copy.copied}</p> : null}
      {status === "fail" ? <p className="text-xs font-semibold text-gold">{copy.failed}</p> : null}
    </section>
  );
}

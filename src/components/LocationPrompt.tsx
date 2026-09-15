"use client";

import { usePlace } from "@/lib/place";
import { useI18n } from "@/lib/i18n/locale";

export function LocationPrompt() {
  const { locating, error, requestLocation, skipLocation } = usePlace();
  const { m } = useI18n();

  return (
    <section
      className="w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,26,0.92)_0%,rgba(8,8,10,0.92)_100%)] p-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
      aria-label={m.geo.section}
    >
      <p className="text-[13px] font-extrabold tracking-wide text-snow">{m.geo.title}</p>
      <p className="mt-1.5 text-[12px] leading-snug text-snow/85">{m.geo.body}</p>

      <div className="mt-3 flex flex-col gap-1.5">
        <button
          type="button"
          className="tap w-full rounded-full border border-cobalt/55 bg-cobalt px-3 text-[12px] font-extrabold text-snow disabled:opacity-60"
          disabled={locating}
          onClick={requestLocation}
        >
          {locating ? m.geo.locating : m.geo.allow}
        </button>
        <button
          type="button"
          className="tap w-full rounded-full border border-white/20 bg-white/[0.06] px-3 text-[12px] font-semibold text-snow/90 disabled:opacity-60"
          disabled={locating}
          onClick={skipLocation}
        >
          {m.geo.skip}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-[11px] leading-snug text-gold" role="status">
          {m.geo.errors[error]}
        </p>
      ) : null}
    </section>
  );
}

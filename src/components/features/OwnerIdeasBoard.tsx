"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FeaturePanel } from "@/components/FeaturePanel";
import { interpolate } from "@/lib/i18n/locales";
import { useI18n } from "@/lib/i18n/locale";
import {
  fetchOwnerIdeaInbox,
  ownerIdeasExportName,
  type IdeaInboxListPayload,
} from "@/lib/idea-inbox";

const fieldClass =
  "tap w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-normal text-snow outline-none focus:border-gold";

const ctaClass =
  "tap inline-flex min-h-11 items-center justify-center rounded-full border border-gold/65 bg-cobalt px-4 text-center text-sm font-extrabold text-snow";

function formatWhen(ms: number, locale: string) {
  if (!ms) return "";
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-CA" : locale === "es" ? "es" : "fr-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

export function OwnerIdeasBoard() {
  const { m, locale } = useI18n();
  const copy = m.ownerIdeas;
  const searchParams = useSearchParams();
  const urlSecret = searchParams.get("secret") || searchParams.get("key") || "";
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(Boolean(urlSecret.trim()));
  const [error, setError] = useState<"unauthorized" | "network" | "">("");
  const [payload, setPayload] = useState<IdeaInboxListPayload | null>(null);

  async function load(nextSecret: string) {
    const trimmed = nextSecret.trim();
    if (!trimmed) {
      setError("unauthorized");
      setPayload(null);
      return;
    }
    setLoading(true);
    setError("");
    const result = await fetchOwnerIdeaInbox(trimmed);
    setLoading(false);
    if (!result.ok) {
      setPayload(null);
      setError(result.status === 401 || result.status === 403 ? "unauthorized" : "network");
      return;
    }
    setPayload(result.payload);
  }

  useEffect(() => {
    if (!urlSecret.trim()) return;
    void load(urlSecret);
  }, [urlSecret]);

  function onUnlock(event: FormEvent) {
    event.preventDefault();
    void load(typed);
  }

  function exportJson() {
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = ownerIdeasExportName();
    anchor.click();
    URL.revokeObjectURL(href);
  }

  const empty = payload && payload.count === 0;
  const cityLabel = (city: string) => (city.trim() ? city : copy.cityUnknown);

  const compiled = useMemo(() => payload?.compiled ?? [], [payload]);

  return (
    <FeaturePanel title={copy.title} lead={copy.lead}>
      <div className="space-y-4" data-owner-ideas>
        <p className="text-base leading-relaxed text-snow/90">{copy.how}</p>

        {!payload ? (
          <form className="space-y-2" onSubmit={onUnlock}>
            <label htmlFor="owner-secret" className="block text-sm font-semibold text-snow">
              {copy.secretLabel}
            </label>
            <input
              id="owner-secret"
              type="password"
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={copy.secretPh}
              className={fieldClass}
            />
            <button type="submit" className={ctaClass} disabled={loading}>
              {copy.open}
            </button>
          </form>
        ) : null}

        {loading ? <p className="text-sm text-ice/80">{copy.loading}</p> : null}
        {error === "unauthorized" ? (
          <p className="text-sm font-semibold text-gold" role="status">
            {copy.unauthorized}
          </p>
        ) : null}
        {error === "network" ? (
          <p className="text-sm font-semibold text-gold" role="status">
            {copy.network}
          </p>
        ) : null}

        {payload ? (
          <div className="space-y-3">
            <p className="text-sm font-extrabold text-snow" data-owner-count>
              {interpolate(copy.count, { n: String(payload.count) })}
            </p>
            <div>
              <h3 className="text-sm font-extrabold text-snow">{copy.compiledTitle}</h3>
              {compiled.length === 0 ? (
                <p className="mt-1 text-sm text-ice/80">{copy.empty}</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm text-snow/90">
                  {compiled.map((row) => (
                    <li key={row.city || "unknown"}>
                      {cityLabel(row.city)} — {row.n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {empty ? (
              <p className="text-sm text-gold" data-owner-empty>
                {copy.empty}
              </p>
            ) : (
              <ol className="space-y-2">
                {payload.ideas.map((idea) => (
                  <li
                    key={idea.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                    data-owner-idea={idea.id}
                  >
                    <p className="text-sm text-snow/80">
                      {cityLabel(idea.city)} · {formatWhen(idea.createdAt, locale)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-snow">{idea.text}</p>
                  </li>
                ))}
              </ol>
            )}
            <button type="button" className={ctaClass} onClick={exportJson}>
              {copy.exportJson}
            </button>
          </div>
        ) : null}
      </div>
    </FeaturePanel>
  );
}

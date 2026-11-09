"use client";

/**
 * Twin side of the OPC image & voice bank (Popol, 09/11/2026): lists ONLY
 * consented, non-withdrawn items, shows the cost before any use, and records
 * the use against the subscription — TEST MODE, nothing is charged.
 */

import { useEffect, useState } from "react";
import { interpolate } from "@/lib/i18n/locales";
import { useI18n } from "@/lib/i18n/locale";
import { formatCad, TWIN_BANK_PRICE_CAD_CENTS, type TwinBankKind } from "@/lib/twin-bank";
import {
  fetchTwinBank,
  fetchTwinBankUsage,
  recordTwinBankUse,
  reportTwinAbuse,
  requestTwinOutputLabel,
  testSubscriberId,
  type TwinBankItem,
  type TwinGenerateResult,
} from "@/lib/twin-bank-client";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-[0_8px_20px_rgba(15,23,42,0.05)]";
const primaryClass =
  "tap inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-3 text-[14px] font-bold text-white disabled:opacity-40";
const checkRowClass = "flex items-start gap-2 text-[13px] leading-snug text-slate-800";
const buttonClass =
  "tap inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-3 text-[14px] font-bold text-slate-900 disabled:opacity-40";
const fieldClass = "mt-1 w-full rounded-xl border border-slate-300 p-2 text-[14px] text-slate-900";

type Load = "loading" | "ok" | "not-configured" | "failed";

export function TwinBankBrowser() {
  const { m, locale } = useI18n();
  const t = m.twinBank;
  const loc = locale === "en" ? "en" : locale === "es" ? "es" : "fr";
  const [load, setLoad] = useState<Load>("loading");
  const [items, setItems] = useState<TwinBankItem[]>([]);
  const [price, setPrice] = useState(TWIN_BANK_PRICE_CAD_CENTS);
  const [subscriber, setSubscriber] = useState("");
  const [acceptCost, setAcceptCost] = useState(false);
  const [acceptRules, setAcceptRules] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, Record<string, string>>>({});
  const [summary, setSummary] = useState<{ count: number; totalCents: number } | null>(null);
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [outputs, setOutputs] = useState<Record<string, TwinGenerateResult>>({});
  const [reportOpen, setReportOpen] = useState<Record<string, boolean>>({});
  const [reportText, setReportText] = useState<Record<string, string>>({});
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const sub = testSubscriberId();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- boot sync from on-device storage
    setSubscriber(sub);
    void (async () => {
      const list = await fetchTwinBank();
      if (list.state === "ok") {
        setItems(list.items);
        if (list.priceCents > 0) setPrice(list.priceCents);
        setLoad("ok");
        const usage = await fetchTwinBankUsage(sub);
        if (usage) setSummary(usage);
      } else {
        setLoad(list.state);
      }
    })();
  }, []);

  async function use(item: TwinBankItem, kind: TwinBankKind) {
    const key = `${item.id}:${kind}`;
    const result = await recordTwinBankUse({ subscriberId: subscriber, itemId: item.id, kind, acceptCost, acceptRules });
    if (result.state !== "recorded") {
      setNotes((n) => ({ ...n, [key]: t.useFailed }));
      return;
    }
    setNotes((n) => ({ ...n, [key]: result.already ? t.alreadyCounted : interpolate(t.used, { month: result.month }) }));
    setLinks((l) => ({ ...l, [key]: result.media }));
    const usage = await fetchTwinBankUsage(subscriber);
    if (usage) setSummary(usage);
  }

  async function labelOutput(item: TwinBankItem, kind: TwinBankKind) {
    const key = `${item.id}:${kind}`;
    const result = await requestTwinOutputLabel({ subscriberId: subscriber, itemId: item.id, kind, prompt: prompts[key] ?? "" });
    setOutputs((o) => ({ ...o, [key]: result }));
  }

  async function sendReport(key: string, outputId: string) {
    const result = await reportTwinAbuse({ outputId, reason: reportText[key] ?? "" });
    setReportNotes((n) => ({ ...n, [key]: result === "received" ? t.reportDone : t.reportFailed }));
    if (result === "received") setReportOpen((r) => ({ ...r, [key]: false }));
  }

  function outputNote(result: TwinGenerateResult | undefined): string {
    if (!result) return "";
    if (result.state === "refused") {
      const reason = t.reasons[result.reason as keyof typeof t.reasons] ?? result.reason;
      return interpolate(t.generateRefused, { reason });
    }
    if (result.state === "needs-use") return t.generateNeedsUse;
    if (result.state === "locked") return t.generateLocked;
    if (result.state === "failed") return t.generateFailed;
    return "";
  }

  const kindLabel = (k: TwinBankKind) => (k === "voice" ? t.kindVoice : t.kindImage);

  return (
    <div className="grid gap-3" data-twin-bank>
      <p className="text-left text-sm leading-snug text-slate-600">{t.lead}</p>
      <section className={cardClass}>
        <p className="inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-wide text-amber-900" data-twin-test-badge>
          {t.testBadge}
        </p>
        <p className="mt-2 text-[14px] font-bold leading-snug text-slate-900" data-twin-cost-notice>
          {interpolate(t.priceNotice, { price: formatCad(price, loc) })}
        </p>
        <p className="mt-1 text-[12px] text-slate-600">{t.pricingProposal}</p>
        <div className="mt-3 grid gap-2">
          <label className={checkRowClass}>
            <input type="checkbox" checked={acceptCost} onChange={(e) => setAcceptCost(e.target.checked)} data-twin-accept="cost" />
            {t.acceptCost}
          </label>
          <label className={checkRowClass}>
            <input type="checkbox" checked={acceptRules} onChange={(e) => setAcceptRules(e.target.checked)} data-twin-accept="rules" />
            {t.acceptRules}
          </label>
        </div>
        {summary ? (
          <p className="mt-3 text-[13px] font-bold text-slate-800" data-twin-summary>
            {t.summaryTitle} : {interpolate(t.summaryLine, { count: String(summary.count), total: formatCad(summary.totalCents, loc) })}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-slate-500">
          {t.subscriberLabel} : <code>{subscriber}</code>
        </p>
      </section>

      {load === "loading" ? <p className="text-[13px] text-slate-700">{t.loading}</p> : null}
      {load === "not-configured" ? <p className="text-[13px] font-bold text-amber-900" data-twin-state="not-configured">{t.notConfigured}</p> : null}
      {load === "failed" ? <p className="text-[13px] font-bold text-red-800" data-twin-state="failed">{t.loadFailed}</p> : null}
      {load === "ok" && items.length === 0 ? <p className="text-[13px] text-slate-700" data-twin-state="empty">{t.empty}</p> : null}

      {items.map((item) => (
        <section key={item.id} className={cardClass} data-twin-item={item.id}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-extrabold text-slate-900">{item.pseudonym}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${item.verified ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"}`}>
              {item.verified ? t.verified : t.unverified}
            </span>
          </div>
          <p className="text-[13px] text-slate-700">{item.country}</p>
          <div className="mt-2 grid gap-2">
            {item.kinds.map((kind) => {
              const key = `${item.id}:${kind}`;
              return (
                <div key={kind}>
                  <button
                    type="button"
                    className={primaryClass}
                    disabled={!acceptCost || !acceptRules || !subscriber}
                    onClick={() => void use(item, kind)}
                    data-twin-use={kind}
                  >
                    {interpolate(t.use, { kind: kindLabel(kind).toLowerCase() })} — {formatCad(price, loc)}
                  </button>
                  {notes[key] ? <p className="mt-1 text-[13px] text-slate-800" data-twin-note>{notes[key]}</p> : null}
                  {Object.entries(links[key] ?? {}).map(([asset, href]) => (
                    <a key={asset} href={href} target="_blank" rel="noreferrer" className="mt-1 block text-[13px] font-bold text-blue-800 underline">
                      {t.openMedia} ({asset})
                    </a>
                  ))}
                  {notes[key] && notes[key] !== t.useFailed ? (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5" data-twin-generate={kind}>
                      <p className="text-[13px] font-extrabold text-slate-900">{t.generateTitle}</p>
                      <p className="mt-1 text-[12px] leading-snug text-slate-700">{t.generateLead}</p>
                      <textarea
                        className={fieldClass}
                        rows={2}
                        maxLength={2000}
                        placeholder={t.generatePlaceholder}
                        value={prompts[key] ?? ""}
                        onChange={(e) => setPrompts((p) => ({ ...p, [key]: e.target.value }))}
                        data-twin-prompt
                      />
                      <button type="button" className={`${buttonClass} mt-2`} onClick={() => void labelOutput(item, kind)} data-twin-generate-button>
                        {t.generateButton}
                      </button>
                      {outputNote(outputs[key]) ? (
                        <p role="status" className="mt-1 text-[13px] font-bold text-red-800" data-twin-generate-note>
                          {outputNote(outputs[key])}
                        </p>
                      ) : null}
                      {(() => {
                        const out = outputs[key];
                        if (!out || out.state !== "labelled") return null;
                        return (
                          <div className="mt-2 rounded-lg border-2 border-slate-900 bg-white p-2" data-twin-ai-label>
                            <p className="text-[12px] font-extrabold uppercase tracking-wide text-slate-900">{t.labelTitle}</p>
                            <p className="mt-1 text-[13px] font-bold text-slate-900">{out.label.visible[loc]}</p>
                            <p className="mt-1 text-[12px] text-slate-700">
                              {t.labelAudible} : « {out.label.audibleIntro[loc]} »
                            </p>
                            <p className="mt-1 text-[12px] text-slate-700">{t.labelYoutube}</p>
                            {out.verifyUrl ? (
                              <a href={out.verifyUrl} target="_blank" rel="noreferrer" className="mt-1 block text-[12px] font-bold text-blue-800 underline">
                                {t.labelVerify}
                              </a>
                            ) : null}
                            {reportOpen[key] ? (
                              <div className="mt-2">
                                <textarea
                                  className={fieldClass}
                                  rows={2}
                                  maxLength={500}
                                  placeholder={t.reportPlaceholder}
                                  value={reportText[key] ?? ""}
                                  onChange={(e) => setReportText((r) => ({ ...r, [key]: e.target.value }))}
                                  data-twin-report-text
                                />
                                <button type="button" className={`${buttonClass} mt-1`} onClick={() => void sendReport(key, out.outputId)} data-twin-report-send>
                                  {t.reportSend}
                                </button>
                              </div>
                            ) : (
                              <button type="button" className="mt-2 text-[12px] font-bold text-red-800 underline" onClick={() => setReportOpen((r) => ({ ...r, [key]: true }))} data-twin-report>
                                {t.reportButton}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                      {reportNotes[key] ? (
                        <p role="status" className="mt-1 text-[12px] font-bold text-slate-900" data-twin-report-note>
                          {reportNotes[key]}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

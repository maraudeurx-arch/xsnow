"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { normalizeEmailInput } from "@/lib/arbitrage";
import { createPortal } from "react-dom";
import { MANUEL_JUSTICE_PAGE_URL, MANUEL_JUSTICE_PDF_URL, ARBITER_TERMS_VERSION, ID_DOC_TYPES, type FaceCheck, type IdDocType, type TermsAcceptance } from "@/lib/arbitrage";
import { arbFetch, readArbiterToken, writeArbiterToken } from "@/lib/arbitrage-client";
import { prepareAdImage } from "@/lib/compress-ad-image";
import { useI18n } from "@/lib/i18n/locale";
import { useLocalProfile } from "@/lib/useLocalProfile";
import { useAccount, useSwitchChain } from "wagmi";
import { BASE_SEPOLIA_CHAIN_ID, type Checklist, type ChecklistItemId } from "@/lib/arb-checklist";
import { ConnectWallet } from "@/components/ConnectWallet";
import { assetUrl } from "@/lib/paths";
import { b64uToUint8, pushSupport, type PushSupport } from "@/lib/push-client";
import { FaceScan } from "./FaceScan";

type Status = "none" | "pending" | "verified" | "rejected" | "rescan_requested" | "not_configured";
type Outcome = "claimant" | "respondent" | "split";
type Suggestion = { outcome: Outcome; refundPercent: number; rationale: string; model: string };
type ArbCase = {
  caseId: string; amountUsdc: number; claimant: string; respondent: string;
  claim: string; response: string; suggestion: Suggestion;
};
type SimCase = {
  simulation: true; caseId: string; title: string; scenario: string;
  choices: { id: string; letter?: string; label: string }[]; myAnswer: string | null;
  suggestion?: { letter: string; text: string; reasoning: string; author: string } | null;
};

const input = "arb-input min-h-11 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-[15px] text-white caret-white placeholder:text-white/60";
const label = "grid gap-1 text-left text-sm font-bold text-slate-800";
const primary = "tap min-h-12 rounded-2xl bg-slate-900 px-4 font-extrabold text-white disabled:opacity-50";

export function ArbitrageBoard() {
  const { m } = useI18n();
  const t = m.arbitrage;
  const [profile] = useLocalProfile();
  const [status, setStatus] = useState<Status>("none");
  const [token, setToken] = useState(() => (typeof window === "undefined" ? "" : readArbiterToken()));
  const [modal, setModal] = useState(false);
  const [terms, setTerms] = useState<TermsAcceptance | null>(null);
  const [hasEmail, setHasEmail] = useState<boolean | null>(null);
  const [red, setRed] = useState(false);

  useEffect(() => {
    const tk = token;
    if (!tk) return;
    arbFetch<{ status: Status; hasEmail?: boolean; red?: boolean }>("me", { token: tk }).then(({ status: code, data }) => {
      if (code === 503) setStatus("not_configured");
      else if (code === 200) { setStatus(data.status); setHasEmail(data.hasEmail === true); setRed(data.red === true); }
      else if (code === 401) writeArbiterToken("");
    }).catch(() => {});
  }, [token]);

  if (!profile) {
    return (
      <div className="grid gap-2 text-left">
        <p className="text-slate-700">{t.needProfile}</p>
        <Link href="/mon-profil/infos/" className={primary + " inline-flex items-center justify-center"}>{t.profileCta}</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 text-left">
      <p className="text-sm leading-snug text-slate-700">{t.lead}</p>
      {status === "pending" ? <p data-arb-status="pending" className="rounded-xl bg-amber-50 p-3 font-bold text-amber-900">{t.statusPending}</p> : null}
      {status === "rejected" ? <p data-arb-status="rejected" className="rounded-xl bg-rose-50 p-3 font-bold text-rose-900">{t.statusRejected}</p> : null}
      {status === "not_configured" ? <p className="rounded-xl bg-slate-100 p-3 text-slate-700">{t.notConfigured}</p> : null}
      {red ? (
        <div role="alert" className="grid gap-1 rounded-2xl border-2 border-red-600 bg-red-50 p-3 text-sm text-red-900" data-arb-red>
          <p className="font-extrabold">{t.red.title}</p>
          <p>{t.red.message}</p>
        </div>
      ) : null}
      {token && (status === "verified" || status === "pending" || status === "rescan_requested") ? <ChecklistCard token={token} status={status} /> : null}
      {token && hasEmail === false && (status === "verified" || status === "pending" || status === "rescan_requested") ? <EmailCard token={token} onDone={() => { setHasEmail(true); refreshChecklist(); }} /> : null}
      {token && (status === "verified" || status === "pending" || status === "rescan_requested") ? <NotifyCard token={token} /> : null}
      {status === "verified" ? <CasesView token={token} red={red} /> : null}
      {status === "rescan_requested" ? <RescanView token={token} onDone={() => setStatus("pending")} /> : null}
      {/* SIMULATION cases for owner-invited, non-verified arbiters (hidden when the server says 403) */}
      {token && (status === "pending" || status === "rescan_requested") ? <SimCasesView token={token} /> : null}
      {token && (status === "pending" || status === "rescan_requested") ? <ManualCard /> : null}
      {status === "none" && !terms ? (
        <button type="button" className={primary} data-arb-become onClick={() => setModal(true)}>{t.title}</button>
      ) : null}
      {modal ? (
        <TermsModal
          onAccept={() => { setTerms({ version: ARBITER_TERMS_VERSION, acceptedAt: new Date().toISOString() }); setModal(false); }}
          onCancel={() => setModal(false)}
        />
      ) : null}
      {status === "none" && terms ? (
        <SignupForm
          terms={terms}
          defaults={{ firstName: profile.firstName, lastName: profile.lastName, opcId: profile.id, email: profile.email ?? "" }}
          onDone={(tk) => { writeArbiterToken(tk); setToken(tk); setStatus("pending"); }}
          onNotConfigured={() => setStatus("not_configured")}
        />
      ) : null}
    </div>
  );
}

export function TermsModal({ onAccept, onCancel }: { onAccept: () => void; onCancel: () => void }) {
  const { m } = useI18n();
  const t = m.arbitrage;
  const boxRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    boxRef.current?.scrollTo({ top: 0 });
    boxRef.current?.querySelector<HTMLButtonElement>("[data-arb-terms-accept]")?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  if (typeof document === "undefined") return null;
  // Portal to <body>: a transformed/blurred ancestor would otherwise trap `fixed` under the sticky header.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]" onClick={onCancel}>
      <section ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="arb-terms-title" data-arb-terms
        className="max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-4 text-left text-slate-900" onClick={(e) => e.stopPropagation()}>
        <h2 id="arb-terms-title" className="text-lg font-extrabold">{t.termsTitle}</h2>
        <ol className="mt-2 grid list-decimal gap-2 pl-5 text-sm leading-snug">
          {t.termsItems.map((item, i) => <li key={i} data-arb-terms-item={i + 1}>{item}</li>)}
        </ol>
        <div className="mt-4 grid gap-2">
          <button type="button" className={primary} data-arb-terms-accept onClick={onAccept}>{t.termsAccept}</button>
          <button type="button" className="tap min-h-11 rounded-2xl border border-slate-300 font-bold" data-arb-terms-cancel onClick={onCancel}>{t.termsCancel}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function SignupForm({ terms, defaults, onDone, onNotConfigured }: {
  terms: TermsAcceptance;
  defaults: { firstName: string; lastName: string; opcId: string; email: string };
  onDone: (token: string) => void;
  onNotConfigured: () => void;
}) {
  const { m } = useI18n();
  const t = m.arbitrage;
  const { locale } = useI18n();
  const [f, setF] = useState({ email: defaults.email, lastName: defaults.lastName, firstName: defaults.firstName, docType: "passport" as IdDocType, docNumber: "", issuingCountry: "", expiryDate: "" });
  const [photo, setPhoto] = useState<string | null>(null);
  const [face, setFace] = useState<FaceCheck | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function onPhoto(file: File | undefined) {
    setPhoto(null);
    setFace(null);
    if (!file) return;
    const r = await prepareAdImage(file);
    if (r.ok && /^data:image\/(jpeg|png|webp);base64,/.test(r.value.dataUrl)) setPhoto(r.value.dataUrl);
    else setError(true);
  }

  async function submit() {
    if (!photo || !face || !consent) return;
    setBusy(true);
    setError(false);
    const [head, b64] = photo.split(",");
    const mime = head.slice(5, head.indexOf(";"));
    try {
      const { status, data } = await arbFetch<{ token: string }>("apply", {
        method: "POST",
        body: { consent: true, ...f, lang: locale, idPhotoBase64: b64, idPhotoMime: mime, face, opcId: defaults.opcId, terms },
      });
      if (status === 503) onNotConfigured();
      else if (status === 201 && data.token) onDone(data.token);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-3" data-arb-form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <section className="rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sm leading-snug text-slate-700" data-arb-privacy>
        <p className="font-extrabold text-slate-900">{t.privacyTitle}</p>
        <p>{t.privacy}</p>
      </section>
      <label className={label}>{t.email.label}<input className={input} type="email" value={f.email} onChange={set("email")} required autoComplete="email" data-arb-email-input /></label>
      <label className={label}>{t.lastName}<input className={input} value={f.lastName} onChange={set("lastName")} required autoComplete="family-name" /></label>
      <label className={label}>{t.firstName}<input className={input} value={f.firstName} onChange={set("firstName")} required autoComplete="given-name" /></label>
      <label className={label}>{t.docType}
        <select className={input} value={f.docType} onChange={set("docType")}>
          {ID_DOC_TYPES.map((d) => <option key={d} value={d}>{t.docTypes[d]}</option>)}
        </select>
      </label>
      <label className={label}>{t.docNumber}<input className={input} value={f.docNumber} onChange={set("docNumber")} required autoComplete="off" /></label>
      <label className={label}>{t.country}<input className={input} value={f.issuingCountry} onChange={set("issuingCountry")} required maxLength={2} autoComplete="off" /></label>
      <label className={label}>{t.expiry}<input className={input} type="date" value={f.expiryDate} onChange={set("expiryDate")} required /></label>
      <label className={label}>{t.photo}<input className={input} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => void onPhoto(e.target.files?.[0])} required /></label>
      <FaceScan key={photo ?? "none"} idPhoto={photo} onResult={setFace} />
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-arb-consent required />
        <span>{t.consent}</span>
      </label>
      {error ? <p role="alert" className="text-sm font-bold text-rose-700">{t.error}</p> : null}
      <button type="submit" className={primary} disabled={busy || !photo || !face || !consent} data-arb-submit>
        {busy ? t.sending : t.submit}
      </button>
    </form>
  );
}

function CasesView({ token, red = false }: { token: string; red?: boolean }) {
  const { m } = useI18n();
  const t = m.arbitrage;
  const [cases, setCases] = useState<ArbCase[] | null>(null);
  const [simCount, setSimCount] = useState<number | null>(null);
  const reload = () => arbFetch<{ cases: ArbCase[] }>("cases", { token }).then(({ data }) => setCases(data.cases ?? [])).catch(() => setCases([]));
  useEffect(() => { void reload(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <section className="grid gap-3" data-arb-cases>
      <p data-arb-status="verified" className="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-900">{t.statusVerified}</p>
      <h2 className="text-lg font-extrabold text-slate-900">{t.casesTitle}</h2>
      {red ? null : cases?.map((c) => <CaseCard key={c.caseId} c={c} token={token} onDecided={reload} />)}
      <SimCasesView token={token} onCount={setSimCount} />
      {cases && cases.length === 0 && simCount === 0 ? <p className="font-bold text-slate-700" data-arb-empty>{t.sim.noPending}</p> : null}
      <ManualCard />
    </section>
  );
}

/** SIMULATION cases: test only — no AI suggestion, no signature, no payment. */
function SimCasesView({ token, onCount }: { token: string; onCount?: (n: number) => void }) {
  const { m } = useI18n();
  const t = m.arbitrage.sim;
  const [cases, setCases] = useState<SimCase[]>([]);
  const [tick, setTick] = useState(0);
  const reload = () => arbFetch<{ cases: SimCase[] }>("sim-cases", { token }).then(({ data }) => { const list = data.cases ?? []; setCases(list); onCount?.(list.length); }).catch(() => { setCases([]); onCount?.(0); });
  useEffect(() => { void reload(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  if (cases.length === 0) return null;
  return (
    <div className="grid gap-3" data-arb-sim-cases>
      <h2 className="text-lg font-extrabold text-slate-900">{t.title}</h2>
      {cases.map((c) => <SimCaseCard key={c.caseId} c={c} token={token} onAnswered={() => setTick((n) => n + 1)} />)}
      <WalletCard token={token} tick={tick} />
    </div>
  );
}

/** Manuel de justice reading suggestion (existing, verified links). Always visible on the arbiter screen. */
function ManualCard({ inline = false }: { inline?: boolean }) {
  const { m } = useI18n();
  const t = m.arbitrage.sim;
  return (
    <div className="grid gap-1 rounded-xl border border-sky-300 bg-sky-50 p-2 text-sm text-slate-800" {...(inline ? { "data-arb-sim-manual": "" } : { "data-arb-manual-standing": "" })}>
      <p className="font-bold">{t.manualTip}</p>
      <a className="font-bold text-sky-800 underline" href={MANUEL_JUSTICE_PDF_URL} target="_blank" rel="noopener" download data-arb-manual-pdf>{t.manualPdf}</a>
      <a className="text-sky-800 underline" href={MANUEL_JUSTICE_PAGE_URL} target="_blank" rel="noopener" data-arb-manual-page>{t.manualPage}</a>
    </div>
  );
}

function SimCaseCard({ c, token, onAnswered }: { c: SimCase; token: string; onAnswered?: () => void }) {
  const { m } = useI18n();
  const t = m.arbitrage.sim;
  const [choice, setChoice] = useState("");
  const [comment, setComment] = useState("");
  const [answer, setAnswer] = useState<string | null>(c.myAnswer);
  const [msg, setMsg] = useState("");
  async function send() {
    const { status } = await arbFetch("sim-cases/answer", { method: "POST", token, body: { caseId: c.caseId, choiceId: choice, ...(comment.trim() ? { comment } : {}) } });
    if (status === 200) { setAnswer(choice); setMsg(t.sent); onAnswered?.(); refreshChecklist(); }
    else if (status === 409) { setAnswer(choice); setMsg(t.already); }
  }
  const letterOf = (i: number) => c.choices[i]?.letter || "ABCD"[i] || String(i + 1);
  const chosenIdx = c.choices.findIndex((x) => x.id === answer);
  const chosen = chosenIdx >= 0 ? `${letterOf(chosenIdx)}. ${c.choices[chosenIdx].label}` : "";
  return (
    <article className="arb-card arb-card-sim grid gap-2 rounded-2xl border-2 border-amber-400 bg-amber-50 p-3 text-sm text-slate-800" data-arb-sim-case={c.caseId}>
      <p role="note" className="arb-sim-banner rounded-xl bg-amber-300 p-2 font-extrabold text-slate-900" data-arb-sim-banner>{t.banner}</p>
      <h3 className="font-extrabold">{c.title}</h3>
      <p className="whitespace-pre-line">{c.scenario}</p>
      {c.suggestion ? (
        <div className="arb-suggestion grid gap-1 rounded-xl bg-slate-50 p-2" data-arb-sim-suggestion>
          <p className="font-extrabold">{t.suggestionTitle.replace("{author}", c.suggestion.author)} : {c.suggestion.letter}</p>
          <p>{c.suggestion.text}</p>
          <p className="text-[13px]"><b>{t.reasoning} :</b> {c.suggestion.reasoning}</p>
        </div>
      ) : null}
      {answer ? (
        <>
          <p className="arb-ok font-bold text-emerald-800" data-arb-sim-done>{msg || t.already} {chosen ? `${t.yours} ${chosen}` : ""}</p>
          <ManualCard inline />
        </>
      ) : (
        <fieldset className="grid gap-2">
          {c.choices.map((ch, i) => (
            <label key={ch.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
              <input type="radio" name={`sim-${c.caseId}`} value={ch.id} checked={choice === ch.id} onChange={() => setChoice(ch.id)} data-arb-sim-choice={ch.id} />
              <span><b data-arb-sim-letter>{letterOf(i)}.</b> {ch.label}</span>
            </label>
          ))}
          <label className={label}>{t.comment}<textarea className={input} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          <button type="button" className={primary} disabled={!choice} onClick={() => void send()} data-arb-sim-send>{t.send}</button>
        </fieldset>
      )}
    </article>
  );
}

/** Existing arbiters without a contact email: "Ajouter mon e-mail" (stored encrypted, used for decision copies). */
function EmailCard({ token, onDone }: { token: string; onDone: () => void }) {
  const { m, locale } = useI18n();
  const t = m.arbitrage.email;
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<"" | "empty" | "invalid" | "session" | "network">("");
  const [busy, setBusy] = useState(false);
  async function save(e?: { preventDefault(): void }) {
    e?.preventDefault();
    // Read the DOM value: iOS autofill / QuickType may not fire onChange on a controlled input.
    const email = normalizeEmailInput(ref.current?.value ?? "");
    if (!email) { setErr("empty"); ref.current?.focus(); return; }
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) { setErr("invalid"); return; }
    setBusy(true); setErr("");
    try {
      const { status } = await arbFetch("email", { method: "POST", token, body: { email, lang: locale } });
      if (status === 200) onDone();
      else setErr(status === 400 ? "invalid" : status === 401 || status === 403 ? "session" : "network");
    } catch { setErr("network"); } finally { setBusy(false); }
  }
  return (
    <form id="arb-email-card" className="grid gap-2 rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-3 text-sm text-slate-800" data-arb-email-card onSubmit={(e) => void save(e)} noValidate>
      <h3 className="font-extrabold">{t.add}</h3>
      <p>{t.why}</p>
      <label htmlFor="arb-email-field" className="font-bold" data-arb-email-label>{t.enterBelow}</label>
      <input id="arb-email-field" ref={ref} className={input} type="email" name="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="email" onInput={() => setErr("")} data-arb-email-field />
      <button type="submit" className={primary} disabled={busy} data-arb-email-save>{t.add}</button>
      {err ? <p role="alert" className="text-rose-800" data-arb-email-error={err}>{err === "empty" ? t.emptyHint : err === "invalid" ? t.invalid : err === "session" ? t.session : t.network}</p> : null}
    </form>
  );
}

/** Ask the onboarding checklist to reload (after an email, a push opt-in, a wallet or an answer). */
const CHECKLIST_EVENT = "opc-arb-checklist";
function refreshChecklist() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHECKLIST_EVENT));
}

/**
 * Onboarding checklist (Popol, 21/10/2026): Indiana trains and approves every arbiter, so the arbiter
 * sees what is still missing, each item with a done/missing state and short, simple steps.
 */
function ChecklistCard({ token, status }: { token: string; status: Status }) {
  const { m } = useI18n();
  const t = m.arbitrage.checklist;
  const [data, setData] = useState<Checklist | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const load = () => arbFetch<Checklist>("checklist", { token }).then(({ status: code, data: d }) => { if (code === 200 && Array.isArray(d.items)) setData(d); }).catch(() => {});
    void load();
    window.addEventListener(CHECKLIST_EVENT, load);
    return () => window.removeEventListener(CHECKLIST_EVENT, load);
  }, [token]);
  if (!data) return null;
  async function markRead() {
    const { status: code, data: d } = await arbFetch<Checklist>("manual-read", { method: "POST", token, body: {} });
    if (code === 200 && Array.isArray(d.items)) { setData(d); setSaved(true); }
  }
  const pct = Math.round((data.doneCount / Math.max(1, data.total)) * 100);
  return (
    <section className="grid gap-2 rounded-2xl border-2 border-emerald-500 bg-white p-3 text-sm text-slate-800" data-arb-checklist data-arb-checklist-done={data.doneCount}>
      <h2 className="text-base font-extrabold text-slate-900">{t.title}</h2>
      <p>{t.lead}</p>
      <div className="grid gap-1">
        <p className="font-bold" data-arb-checklist-progress>{t.progress.replace("{done}", String(data.doneCount)).replace("{total}", String(data.total))}</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} /></div>
        <p className="font-bold text-emerald-800" data-arb-checklist-cheer>{data.complete ? t.allDone : t.keepGoing}</p>
      </div>
      <ul className="grid gap-2">
        {data.items.map((it) => {
          const copy = t.items[it.id as ChecklistItemId];
          return (
            <li key={it.id} className={`grid gap-1 rounded-xl border p-2 ${it.done ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}
              data-arb-checklist-item={it.id} data-arb-checklist-state={it.done ? "done" : "missing"}>
              <p className="flex items-center gap-2 font-extrabold">
                <span aria-hidden="true">{it.done ? "✅" : "⏳"}</span>
                <span>{copy.title}</span>
                <span className={`ml-auto shrink-0 whitespace-nowrap rounded-full px-2 text-[12px] ${it.done ? "bg-emerald-700 text-white" : "bg-amber-300 text-slate-900"}`}>{it.done ? t.doneLabel : t.missingLabel}</span>
              </p>
              {it.done ? <p className="text-[13px]">{copy.done}</p> : (
                <>
                  {it.id === "wallet" && it.state === "wrong_chain" ? <p className="text-[13px] font-bold" data-arb-checklist-wrong-chain>{t.items.wallet.wrongChain}</p> : null}
                  <ol className="list-decimal pl-5 text-[13px]" data-arb-checklist-steps>
                    {copy.steps.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                  {it.id === "email" ? <a className="text-[13px] font-bold text-sky-800 underline" href="#arb-email-card">{t.goEmail}</a> : null}
                  {it.id === "notifications" ? <a className="text-[13px] font-bold text-sky-800 underline" href="#arb-notify-card">{t.goNotify}</a> : null}
                  {it.id === "wallet" ? (status === "verified" ? <ChecklistWallet token={token} /> : <p className="text-[13px]">{t.walletAfterVerify}</p>) : null}
                  {it.id === "manual" ? (
                    <div className="grid gap-1">
                      <a className="font-bold text-sky-800 underline" href={MANUEL_JUSTICE_PAGE_URL} target="_blank" rel="noopener" data-arb-checklist-manual-link>{t.manualLink}</a>
                      <button type="button" className={primary} onClick={() => void markRead()} data-arb-checklist-manual-read>{t.manualRead}</button>
                    </div>
                  ) : null}
                </>
              )}
              {it.id === "manual" && it.done && saved ? <p className="text-[13px] font-bold text-emerald-800">{t.manualSaved}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Wallet step of the checklist: Connect, then switch to Base Sepolia (test network). No payment. */
function ChecklistWallet({ token }: { token: string }) {
  const { m } = useI18n();
  const t = m.arbitrage.checklist;
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [posted, setPosted] = useState("");
  useEffect(() => {
    if (!isConnected || !address || !chainId) return;
    const key = `${address}:${chainId}`;
    if (posted === key) return;
    void arbFetch("wallet", { method: "POST", token, body: { address, chainId } }).then(({ status }) => {
      if (status === 200) { setPosted(key); refreshChecklist(); }
    });
  }, [isConnected, address, chainId, posted, token]);
  return (
    <div className="grid gap-1" data-arb-checklist-wallet>
      <ConnectWallet compact />
      {isConnected && chainId !== BASE_SEPOLIA_CHAIN_ID ? (
        <button type="button" className={primary} onClick={() => switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID })} data-arb-checklist-switch>{t.switchChain}</button>
      ) : null}
    </div>
  );
}

/** Opt-in Web Push: the phone rings when a case or simulation is waiting. iOS: Home Screen app only. */
function NotifyCard({ token }: { token: string }) {
  const { m } = useI18n();
  const t = m.arbitrage.notify;
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [state, setState] = useState<"idle" | "on" | "denied" | "forbidden" | "error" | "not_configured">("idle");
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const detected = pushSupport({
      ua: nav.userAgent,
      standalone: window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true,
      hasPush: "PushManager" in window, hasSw: "serviceWorker" in nav, hasNotification: "Notification" in window,
    });
    void Promise.resolve().then(() => setSupport(detected));
    if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in nav) {
      void nav.serviceWorker.getRegistration(assetUrl("/")).then((reg) => reg?.pushManager.getSubscription()).then((s) => { if (s) setState("on"); });
    }
  }, []);
  async function enable() {
    try {
      const { status, data } = await arbFetch<{ key?: string }>("push/vapid-key");
      if (status !== 200 || !data.key) { setState("not_configured"); return; }
      if ((await Notification.requestPermission()) !== "granted") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.register(assetUrl("/arb-push-sw.js"), { scope: assetUrl("/") });
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToUint8(data.key) as BufferSource });
      const r = await arbFetch("push/subscribe", { method: "POST", token, body: { endpoint: sub.endpoint } });
      setState(r.status === 200 ? "on" : r.status === 403 ? "forbidden" : "error");
      if (r.status === 200) refreshChecklist();
    } catch { setState("error"); }
  }
  if (!support) return null;
  return (
    <section id="arb-notify-card" className="grid gap-2 rounded-2xl border-2 border-violet-400 bg-violet-50 p-3 text-sm text-slate-800" data-arb-notify>
      <h3 className="font-extrabold">{t.title}</h3>
      {support === "ios-install" ? <p data-arb-notify-ios>{t.iosInstall}</p> : null}
      {support === "unsupported" ? <p data-arb-notify-unsupported>{t.unsupported}</p> : null}
      {support === "ok" && state === "on" ? <p className="font-bold text-emerald-800" data-arb-notify-on>{t.on}</p> : null}
      {support === "ok" && state !== "on" ? (
        <>
          <p>{t.body}</p>
          <button type="button" className={primary} onClick={() => void enable()} data-arb-notify-enable>{t.enable}</button>
          {state === "denied" ? <p className="text-rose-800">{t.denied}</p> : null}
          {state === "forbidden" ? <p className="text-rose-800">{t.forbidden}</p> : null}
          {state === "error" || state === "not_configured" ? <p className="text-rose-800">{t.error}</p> : null}
        </>
      ) : null}
    </section>
  );
}

/** After the first simulated answer: ask the arbiter to connect a wallet (Connect offers to create one). No payment here. */
function WalletCard({ token, tick }: { token: string; tick: number }) {
  const { m } = useI18n();
  const t = m.arbitrage.wallet;
  const { address, chainId, isConnected } = useAccount();
  const [state, setState] = useState<{ address: string | null; needsWallet: boolean } | null>(null);
  useEffect(() => {
    arbFetch<{ address: string | null; needsWallet: boolean }>("wallet", { token }).then(({ data }) => setState(data)).catch(() => setState(null));
  }, [token, tick]);
  useEffect(() => {
    if (!isConnected || !address || !state || state.address || !state.needsWallet) return;
    void arbFetch("wallet", { method: "POST", token, body: { address, chainId } }).then(({ status }) => {
      if (status === 200) { setState({ address, needsWallet: false }); refreshChecklist(); }
    });
  }, [isConnected, address, chainId, state, token]);
  if (!state) return null;
  if (state.address) return <p className="text-sm text-slate-700" data-arb-wallet-connected>{t.connected} {state.address.slice(0, 6)}…{state.address.slice(-4)}</p>;
  if (!state.needsWallet) return null;
  return (
    <section className="grid gap-2 rounded-2xl border-2 border-sky-400 bg-sky-50 p-3 text-sm text-slate-800" data-arb-wallet-card>
      <h3 className="font-extrabold">{t.title}</h3>
      <p>{t.body}</p>
      <ConnectWallet compact />
    </section>
  );
}

function CaseCard({ c, token, onDecided }: { c: ArbCase; token: string; onDecided: () => void }) {
  const { m } = useI18n();
  const t = m.arbitrage;
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("split");
  const [refund, setRefund] = useState(50);
  const [rationale, setRationale] = useState("");
  const [done, setDone] = useState(false);

  async function decide(accept: boolean) {
    const { status } = await arbFetch("cases/decide", {
      method: "POST",
      token,
      body: accept
        ? { caseId: c.caseId, accept: true }
        : { caseId: c.caseId, accept: false, reason, overrideDecision: { outcome, refundPercent: refund, rationale } },
    });
    if (status === 200) { setDone(true); setTimeout(onDecided, 1500); }
  }

  return (
    <article className="arb-card grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-800" data-arb-case={c.caseId}>
      <p><b>{t.amount} :</b> {c.amountUsdc} USDC — {c.claimant} / {c.respondent}</p>
      <p><b>{t.claim} :</b> {c.claim}</p>
      <p><b>{t.response} :</b> {c.response}</p>
      <div className="arb-suggestion rounded-xl bg-slate-50 p-2">
        <p className="font-extrabold">{t.suggestion} ({c.suggestion.model})</p>
        <p>{t.outcome[c.suggestion.outcome]} — {t.refund} {c.suggestion.refundPercent} %</p>
        <p>{c.suggestion.rationale}</p>
      </div>
      {done ? <p className="arb-ok font-bold text-emerald-800">{t.decided}</p> : rejecting ? (
        <div className="grid gap-2">
          <label className={label}>{t.reason}<textarea className={input} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <label className={label}>{t.myDecision}
            <select className={input} value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
              {(["claimant", "respondent", "split"] as const).map((o) => <option key={o} value={o}>{t.outcome[o]}</option>)}
            </select>
          </label>
          <label className={label}>{t.refund} (%)<input className={input} type="number" min={0} max={100} value={refund} onChange={(e) => setRefund(Number(e.target.value))} /></label>
          <label className={label}>{t.rationale}<textarea className={input} value={rationale} onChange={(e) => setRationale(e.target.value)} /></label>
          <button type="button" className={primary} disabled={!reason.trim() || !rationale.trim()} onClick={() => void decide(false)}>{t.confirmReject}</button>
        </div>
      ) : (
        <div className="grid gap-2">
          <button type="button" className={primary} data-arb-accept onClick={() => void decide(true)}>{t.accept}</button>
          <button type="button" className="tap min-h-11 rounded-2xl border border-slate-300 font-bold" data-arb-reject onClick={() => setRejecting(true)}>{t.reject}</button>
        </div>
      )}
    </article>
  );
}

/** Admin asked for a new face scan: redo ONLY the face scan + liveness, against the ID photo already on file. */
function RescanView({ token, onDone }: { token: string; onDone: () => void }) {
  const { m } = useI18n();
  const t = m.arbitrage.rescan;
  const [photo, setPhoto] = useState<string | null>(null);
  const [face, setFace] = useState<FaceCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    arbFetch<{ mime: string; base64: string }>("rescan/photo", { token }).then(({ status, data }) => {
      if (status === 200 && data.base64) setPhoto(`data:${data.mime};base64,${data.base64}`);
      else setError(true);
    }).catch(() => setError(true));
  }, [token]);
  async function send() {
    if (!face) return;
    setBusy(true);
    const { status } = await arbFetch("rescan", { method: "POST", token, body: { face } });
    setBusy(false);
    if (status === 200) onDone();
    else setError(true);
  }
  return (
    <section className="grid gap-3" data-arb-rescan>
      <p data-arb-status="rescan_requested" role="status" className="rounded-xl bg-amber-50 p-3 font-bold text-amber-900">{t.message}</p>
      <p className="text-sm text-slate-700">{t.howto}</p>
      {photo ? <FaceScan idPhoto={photo} onResult={setFace} /> : null}
      {error ? <p role="alert" className="text-sm font-bold text-rose-700">{t.error}</p> : null}
      <button type="button" className={primary} disabled={!face || busy} onClick={() => void send()} data-arb-rescan-send>{busy ? m.arbitrage.sending : t.send}</button>
    </section>
  );
}

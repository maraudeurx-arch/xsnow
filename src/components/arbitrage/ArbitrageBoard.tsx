"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ARBITER_TERMS_VERSION, ID_DOC_TYPES, type FaceCheck, type IdDocType, type TermsAcceptance } from "@/lib/arbitrage";
import { arbFetch, readArbiterToken, writeArbiterToken } from "@/lib/arbitrage-client";
import { prepareAdImage } from "@/lib/compress-ad-image";
import { useI18n } from "@/lib/i18n/locale";
import { useLocalProfile } from "@/lib/useLocalProfile";
import { FaceScan } from "./FaceScan";

type Status = "none" | "pending" | "verified" | "rejected" | "not_configured";
type Outcome = "claimant" | "respondent" | "split";
type Suggestion = { outcome: Outcome; refundPercent: number; rationale: string; model: string };
type ArbCase = {
  caseId: string; amountUsdc: number; claimant: string; respondent: string;
  claim: string; response: string; suggestion: Suggestion;
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

  useEffect(() => {
    const tk = token;
    if (!tk) return;
    arbFetch<{ status: Status }>("me", { token: tk }).then(({ status: code, data }) => {
      if (code === 503) setStatus("not_configured");
      else if (code === 200) setStatus(data.status);
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
      {status === "verified" ? <CasesView token={token} /> : null}
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
          defaults={{ firstName: profile.firstName, lastName: profile.lastName, opcId: profile.id }}
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
  defaults: { firstName: string; lastName: string; opcId: string };
  onDone: (token: string) => void;
  onNotConfigured: () => void;
}) {
  const { m } = useI18n();
  const t = m.arbitrage;
  const [f, setF] = useState({ lastName: defaults.lastName, firstName: defaults.firstName, docType: "passport" as IdDocType, docNumber: "", issuingCountry: "", expiryDate: "" });
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
        body: { consent: true, ...f, idPhotoBase64: b64, idPhotoMime: mime, face, opcId: defaults.opcId, terms },
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

function CasesView({ token }: { token: string }) {
  const { m } = useI18n();
  const t = m.arbitrage;
  const [cases, setCases] = useState<ArbCase[] | null>(null);
  const reload = () => arbFetch<{ cases: ArbCase[] }>("cases", { token }).then(({ data }) => setCases(data.cases ?? [])).catch(() => setCases([]));
  useEffect(() => { void reload(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <section className="grid gap-3" data-arb-cases>
      <p data-arb-status="verified" className="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-900">{t.statusVerified}</p>
      <h2 className="text-lg font-extrabold text-slate-900">{t.casesTitle}</h2>
      {cases && cases.length === 0 ? <p className="text-slate-700">{t.noCases}</p> : null}
      {cases?.map((c) => <CaseCard key={c.caseId} c={c} token={token} onDecided={reload} />)}
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
    <article className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-800" data-arb-case={c.caseId}>
      <p><b>{t.amount} :</b> {c.amountUsdc} USDC — {c.claimant} / {c.respondent}</p>
      <p><b>{t.claim} :</b> {c.claim}</p>
      <p><b>{t.response} :</b> {c.response}</p>
      <div className="rounded-xl bg-slate-50 p-2">
        <p className="font-extrabold">{t.suggestion} ({c.suggestion.model})</p>
        <p>{t.outcome[c.suggestion.outcome]} — {t.refund} {c.suggestion.refundPercent} %</p>
        <p>{c.suggestion.rationale}</p>
      </div>
      {done ? <p className="font-bold text-emerald-800">{t.decided}</p> : rejecting ? (
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

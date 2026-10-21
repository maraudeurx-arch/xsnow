"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MANUEL_JUSTICE_PAGE_URL, MANUEL_JUSTICE_PDF_URL, ARBITER_TERMS_VERSION, ID_DOC_TYPES, type FaceCheck, type IdDocType, type TermsAcceptance } from "@/lib/arbitrage";
import { arbFetch, readArbiterToken, writeArbiterToken } from "@/lib/arbitrage-client";
import { prepareAdImage } from "@/lib/compress-ad-image";
import { useI18n } from "@/lib/i18n/locale";
import { useLocalProfile } from "@/lib/useLocalProfile";
import { useAccount } from "wagmi";
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

  useEffect(() => {
    const tk = token;
    if (!tk) return;
    arbFetch<{ status: Status; hasEmail?: boolean }>("me", { token: tk }).then(({ status: code, data }) => {
      if (code === 503) setStatus("not_configured");
      else if (code === 200) { setStatus(data.status); setHasEmail(data.hasEmail === true); }
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
      {token && hasEmail === false && (status === "verified" || status === "pending" || status === "rescan_requested") ? <EmailCard token={token} onDone={() => setHasEmail(true)} /> : null}
      {token && (status === "verified" || status === "pending" || status === "rescan_requested") ? <NotifyCard token={token} /> : null}
      {status === "verified" ? <CasesView token={token} /> : null}
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

function CasesView({ token }: { token: string }) {
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
      {cases?.map((c) => <CaseCard key={c.caseId} c={c} token={token} onDecided={reload} />)}
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
    if (status === 200) { setAnswer(choice); setMsg(t.sent); onAnswered?.(); }
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
  const [email, setEmail] = useState("");
  const [err, setErr] = useState(false);
  async function save() {
    const { status } = await arbFetch("email", { method: "POST", token, body: { email, lang: locale } });
    if (status === 200) onDone(); else setErr(true);
  }
  return (
    <section className="grid gap-2 rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-3 text-sm text-slate-800" data-arb-email-card>
      <h3 className="font-extrabold">{t.add}</h3>
      <p>{t.why}</p>
      <input className={input} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(false); }} autoComplete="email" aria-label={t.label} data-arb-email-field />
      <button type="button" className={primary} disabled={!email.includes("@")} onClick={() => void save()} data-arb-email-save>{t.add}</button>
      {err ? <p className="text-rose-800">{t.invalid}</p> : null}
    </section>
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
    } catch { setState("error"); }
  }
  if (!support) return null;
  return (
    <section className="grid gap-2 rounded-2xl border-2 border-violet-400 bg-violet-50 p-3 text-sm text-slate-800" data-arb-notify>
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
      if (status === 200) setState({ address, needsWallet: false });
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

"use client";

/**
 * « Chef de projet » › S'enregistrer (équipe, 02/11/2026).
 * Same official path as « Devenir arbitre », reusing its components and Worker routes:
 * conditions modal → ID papers + one ID photo → in-browser face scan (only a score leaves the device)
 * → privacy consent → e-mail → notifications → Project Lead instructions (PDF + mandatory,
 * timestamped acceptance; replaces the Manuel de justice) → approval by the OPC team.
 * No wallet, no crypto, no token, no amount.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmailCard, LoginCard, NotifyCard, SignupForm, TermsModal, CHECKLIST_EVENT, refreshChecklist } from "@/components/arbitrage/ArbitrageBoard";
import { arbContactHref } from "@/lib/arb-checklist";
import type { TermsAcceptance } from "@/lib/arbitrage";
import { arbFetch } from "@/lib/arbitrage-client";
import { useI18n } from "@/lib/i18n/locale";
import { assetUrl } from "@/lib/paths";
import {
  PROJECT_LEAD_INSTRUCTIONS_PDF,
  PROJECT_LEAD_INSTRUCTIONS_VERSION,
  PROJECT_LEAD_STEPS,
  PROJECT_LEAD_TERMS_VERSION,
  PROJECT_LEAD_TOKEN_KEY,
  instructionsPdfFor,
  type ProjectLeadChecklist,
} from "@/lib/project-lead-registration";
import { useLocalProfile } from "@/lib/useLocalProfile";

type Status = "none" | "pending" | "verified" | "rejected" | "rescan_requested" | "not_configured";

function readToken(): string {
  try { return localStorage.getItem(PROJECT_LEAD_TOKEN_KEY) || ""; } catch { return ""; }
}
function writeToken(token: string) {
  try {
    if (token) localStorage.setItem(PROJECT_LEAD_TOKEN_KEY, token);
    else localStorage.removeItem(PROJECT_LEAD_TOKEN_KEY);
  } catch { /* private mode */ }
}

const primary = "tap min-h-12 rounded-2xl bg-slate-900 px-4 font-extrabold text-white disabled:opacity-50";

export function ProjectLeadRegistration() {
  const { m } = useI18n();
  const r = m.earnNow.projectLead.register;
  const [profile] = useLocalProfile();
  const [token, setToken] = useState(() => (typeof window === "undefined" ? "" : readToken()));
  const [status, setStatus] = useState<Status>("none");
  const [hasEmail, setHasEmail] = useState<boolean | null>(null);
  const [modal, setModal] = useState(false);
  const [terms, setTerms] = useState<TermsAcceptance | null>(null);

  useEffect(() => {
    if (!token) return;
    arbFetch<{ status: Status; role?: string; hasEmail?: boolean }>("me", { token }).then(({ status: code, data }) => {
      if (code === 503) setStatus("not_configured");
      else if (code === 200 && data.role === "project_lead") { setStatus(data.status); setHasEmail(data.hasEmail === true); }
      else if (code === 200 || code === 401) { writeToken(""); setToken(""); }
    }).catch(() => {});
  }, [token]);

  const onToken = (tk: string) => { writeToken(tk); setToken(tk); };
  const active = !!token && (status === "pending" || status === "verified" || status === "rescan_requested");

  return (
    <div className="grid gap-3 rounded-2xl bg-white p-3 text-left text-slate-900" data-project-lead-register>
      <h3 className="text-[15px] font-extrabold">{r.title}</h3>
      <p className="text-[13px] leading-snug text-slate-700">{r.lead}</p>
      <div>
        <p className="text-[13px] font-bold">{r.stepsTitle}</p>
        <ol className="list-decimal pl-5 text-[13px]" data-project-lead-steps>
          {PROJECT_LEAD_STEPS.map((id) => <li key={id} data-project-lead-step={id}>{r.steps[id]}</li>)}
        </ol>
      </div>
      {status === "pending" ? <p className="rounded-xl bg-amber-50 p-2 text-[13px] font-bold text-amber-900" data-project-lead-status="pending">{r.statusPending}</p> : null}
      {status === "verified" ? <p className="rounded-xl bg-emerald-50 p-2 text-[13px] font-bold text-emerald-900" data-project-lead-status="verified">{r.statusVerified}</p> : null}
      {status === "rejected" ? <p className="rounded-xl bg-rose-50 p-2 text-[13px] font-bold text-rose-900" data-project-lead-status="rejected">{r.statusRejected}</p> : null}
      {status === "not_configured" ? <p className="rounded-xl bg-slate-100 p-2 text-[13px]">{m.arbitrage.notConfigured}</p> : null}

      {status === "verified" ? (
        <Link className={primary + " inline-flex items-center justify-center"} href="/mes-projets/" data-project-lead-projects-open>
          {m.earnNow.projectLead.projects.open}
        </Link>
      ) : null}
      {active ? <ProjectLeadChecklistCard token={token} opcId={profile?.id ?? ""} /> : null}
      {active && hasEmail === false ? <EmailCard token={token} why={r.emailWhy} onDone={() => { setHasEmail(true); refreshChecklist(); }} /> : null}
      {active ? <NotifyCard token={token} title={r.steps.notifications} body={r.notifyBody} /> : null}

      {status === "none" && !terms ? (
        <button type="button" className={primary} data-project-lead-register-open onClick={() => setModal(true)}>{r.cta}</button>
      ) : null}
      {!token && status === "none" && !terms ? <LoginCard role="project_lead" copy={{ title: r.loginTitle, emailLabel: r.loginEmail }} onDone={onToken} /> : null}
      {modal ? (
        <TermsModal
          title={r.termsTitle}
          items={r.termsItems}
          onAccept={() => { setTerms({ version: PROJECT_LEAD_TERMS_VERSION, acceptedAt: new Date().toISOString() }); setModal(false); }}
          onCancel={() => setModal(false)}
        />
      ) : null}
      {status === "none" && terms ? (
        <SignupForm
          role="project_lead"
          terms={terms}
          copy={{ privacyTitle: r.privacyTitle, privacy: r.privacy, consent: r.consent }}
          defaults={{ firstName: profile?.firstName ?? "", lastName: profile?.lastName ?? "", opcId: profile?.id ?? "", email: profile?.email ?? "" }}
          onDone={(tk) => { onToken(tk); setStatus("pending"); }}
          onNotConfigured={() => setStatus("not_configured")}
        />
      ) : null}
    </div>
  );
}

function ProjectLeadChecklistCard({ token, opcId }: { token: string; opcId: string }) {
  const { m, locale } = useI18n();
  const r = m.earnNow.projectLead.register;
  const c = m.arbitrage.checklist;
  const [data, setData] = useState<ProjectLeadChecklist | null>(null);
  useEffect(() => {
    const load = () => arbFetch<ProjectLeadChecklist>("checklist", { token }).then(({ status, data: d }) => { if (status === 200 && Array.isArray(d.items)) setData(d); }).catch(() => {});
    void load();
    window.addEventListener(CHECKLIST_EVENT, load);
    return () => window.removeEventListener(CHECKLIST_EVENT, load);
  }, [token]);
  if (!data) return null;
  return (
    <section className="grid gap-2 rounded-2xl border-2 border-emerald-500 bg-white p-3 text-sm text-slate-800" data-project-lead-checklist data-project-lead-checklist-done={data.doneCount}>
      <h3 className="text-base font-extrabold text-slate-900">{r.checklistTitle}</h3>
      <p className="text-[13px]">{r.checklistLead}</p>
      <p className="font-bold">{c.progress.replace("{done}", String(data.doneCount)).replace("{total}", String(data.total))}</p>
      <ul className="grid gap-2">
        {data.items.map((it) => (
          <li key={it.id} className={`grid gap-1 rounded-xl border p-2 ${it.done ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}
            data-project-lead-item={it.id} data-project-lead-state={it.done ? "done" : "missing"}>
            <p className="flex items-center gap-2 font-extrabold">
              <span aria-hidden="true">{it.done ? "✅" : "⏳"}</span>
              <span>{r.steps[it.id]}</span>
              <span className="ml-auto text-[12px]">{it.done ? c.doneLabel : c.missingLabel}</span>
            </p>
            {it.id === "instructions" ? (
              <InstructionsStep token={token} locale={locale} acceptedAt={data.instructionsReadAt} onDone={setData} />
            ) : null}
            {it.id === "approval" && !it.done ? <p className="text-[13px]">{r.approvalWaiting}</p> : null}
          </li>
        ))}
      </ul>
      {data.complete ? <p className="font-bold text-emerald-800">{r.allDone}</p> : null}
      <a className={primary + " inline-flex items-center justify-center"} href={arbContactHref(r.contactSubject, opcId)} data-project-lead-contact>{c.contactCta}</a>
    </section>
  );
}

/** Replaces « Lire le Manuel de justice »: PDF link + mandatory, timestamped acceptance box. */
function InstructionsStep({ token, locale, acceptedAt, onDone }: {
  token: string; locale: string; acceptedAt: string | null; onDone: (d: ProjectLeadChecklist) => void;
}) {
  const { m } = useI18n();
  const r = m.earnNow.projectLead.register;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const main = instructionsPdfFor(locale);
  const other = main === PROJECT_LEAD_INSTRUCTIONS_PDF.fr ? PROJECT_LEAD_INSTRUCTIONS_PDF.en : PROJECT_LEAD_INSTRUCTIONS_PDF.fr;
  async function accept() {
    setBusy(true); setErr("");
    try {
      const { status, data } = await arbFetch<ProjectLeadChecklist>("instructions-accept", { method: "POST", token, body: { accept: true, version: PROJECT_LEAD_INSTRUCTIONS_VERSION } });
      if (status === 200 && Array.isArray(data.items)) onDone(data);
      else setErr(status === 409 ? r.instructionsStale : m.arbitrage.email.network);
    } catch { setErr(m.arbitrage.email.network); } finally { setBusy(false); }
  }
  return (
    <div className="grid gap-1 text-[13px]" data-project-lead-instructions>
      <p>{r.instructionsLead}</p>
      <a className="font-bold text-sky-800 underline" href={assetUrl(main)} target="_blank" rel="noopener" data-project-lead-instructions-pdf>{r.instructionsPdf}</a>
      <a className="text-sky-800 underline" href={assetUrl(other)} target="_blank" rel="noopener">{r.instructionsPdfOther}</a>
      {acceptedAt ? (
        <p className="font-bold text-emerald-800" data-project-lead-instructions-saved>{r.instructionsSaved.replace("{date}", new Date(acceptedAt).toLocaleString(locale))}</p>
      ) : (
        <label className="flex items-start gap-2 font-bold">
          <input type="checkbox" className="mt-1 h-5 w-5" required disabled={busy}
            onChange={(e) => { if (e.target.checked) void accept(); }} data-project-lead-instructions-accept />
          <span>{r.instructionsAccept}</span>
        </label>
      )}
      {err ? <p role="alert" className="text-rose-800">{err}</p> : null}
    </div>
  );
}

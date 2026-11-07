"use client";

/**
 * « Mes projets » — l'espace de gestion des chefs de projet Clé en Main (07/11/2026).
 *
 * Visible seulement pour un chef de projet VALIDÉ par l'équipe (même jeton et même
 * route « me » que l'inscription Chef de projet). Liste des projets rattachés à son
 * code OPC (registre src/lib/lead-projects.ts — conçu pour 10, 15, 20 projets :
 * une simple liste, aucune limite codée), page par projet (résumé, cahier des
 * charges, étapes) et discussion avec l'IA du projet DANS l'application
 * (canal chef, src/lib/lead-project-chat.ts) — le courriel ne sert qu'à notifier.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { arbFetch } from "@/lib/arbitrage-client";
import { useI18n } from "@/lib/i18n/locale";
import { completeChat } from "@/lib/llm";
import {
  appendLeadTurn,
  leadProjectSystemPrompt,
  leadThreadContext,
  readLeadThread,
  writeLeadThread,
  type LeadThreadTurn,
} from "@/lib/lead-project-chat";
import { leadProjectsFor, type LeadProject } from "@/lib/lead-projects";
import { PROJECT_LEAD_TOKEN_KEY } from "@/lib/project-lead-registration";
import { CHAT_TEXT_MAX, sanitizeUntrustedText } from "@/lib/sanitize";
import { useLocalProfile } from "@/lib/useLocalProfile";

type Gate = "loading" | "none" | "pending" | "rejected" | "not_configured" | "verified";

function readToken(): string {
  try { return localStorage.getItem(PROJECT_LEAD_TOKEN_KEY) || ""; } catch { return ""; }
}

const card = "grid gap-3 rounded-2xl bg-white p-3 text-left text-slate-900";
const primary = "tap min-h-12 rounded-2xl bg-slate-900 px-4 font-extrabold text-white disabled:opacity-50";
const ghost = "tap inline-flex min-h-11 items-center rounded-2xl border border-slate-300 bg-white px-3 font-bold text-slate-900";

function lastActivity(project: LeadProject, opcId: string): string {
  const thread = readLeadThread(opcId, project.id);
  const last = thread.length ? thread[thread.length - 1]?.at ?? "" : "";
  return last && last.slice(0, 10) > project.updatedAt ? last.slice(0, 10) : project.updatedAt;
}

export function LeadProjectsBoard() {
  const { m, locale } = useI18n();
  const t = m.earnNow.projectLead.projects;
  const [profile] = useLocalProfile();
  const [token] = useState(() => (typeof window === "undefined" ? "" : readToken()));
  const [gate, setGate] = useState<Gate>("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    arbFetch<{ status: string; role?: string }>("me", { token })
      .then(({ status, data }) => {
        if (!live) return;
        if (status === 503) setGate("not_configured");
        else if (status === 200 && data.role === "project_lead") {
          if (data.status === "verified") setGate("verified");
          else if (data.status === "rejected") setGate("rejected");
          else setGate("pending");
        } else setGate("none");
      })
      .catch(() => { if (live) setGate("none"); });
    return () => { live = false; };
  }, [token]);

  const opcId = profile?.id ?? "";
  const projects = useMemo(() => (gate === "verified" ? leadProjectsFor(opcId) : []), [gate, opcId]);
  const selected = projects.find((p) => p.id === selectedId) ?? null;

  if (token && gate === "loading") {
    return <div className={card} data-lead-projects="loading"><p className="text-[13px]">{t.loading}</p></div>;
  }
  if (!token || gate !== "verified") {
    const gateState: Gate = !token ? "none" : gate;
    return (
      <div className={card} data-lead-projects="gate" data-lead-projects-gate={gateState}>
        <h3 className="text-[15px] font-extrabold">{t.gateTitle}</h3>
        <p className="text-[13px] leading-snug text-slate-700">
          {gateState === "pending" ? t.gatePending : gateState === "rejected" ? t.gateRejected : gateState === "not_configured" ? m.arbitrage.notConfigured : t.gateNone}
        </p>
        <Link className={primary + " inline-flex items-center justify-center"} href="/gagner-maintenant/">{t.toEarn}</Link>
      </div>
    );
  }

  if (selected) {
    return <LeadProjectDetail key={selected.id} project={selected} opcId={opcId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="grid gap-3" data-lead-projects="list">
      <div className={card}>
        <h3 className="text-[15px] font-extrabold">{t.title}</h3>
        <p className="text-[13px] leading-snug text-slate-700">{t.lead}</p>
        <p className="text-[13px] font-bold" data-lead-projects-count>{projects.length}</p>
      </div>
      {projects.length === 0 ? (
        <div className={card} data-lead-projects-empty>
          <p className="text-[13px] leading-snug text-slate-700">{t.empty}</p>
        </div>
      ) : (
        projects.map((p) => (
          <button
            key={p.id}
            type="button"
            className={card + " tap w-full"}
            data-lead-project-card={p.id}
            onClick={() => setSelectedId(p.id)}
          >
            <p className="flex items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-wide text-slate-500">
                {t.projectNumber.replace("{n}", String(p.number))}
              </span>
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-bold text-emerald-900">
                {t.statuses[p.status]}
              </span>
            </p>
            <p className="text-[16px] font-extrabold">{p.title}</p>
            <p className="text-[13px] text-slate-700">
              {t.clientCode} : <b>{p.clientCode || t.clientCodePending}</b>
            </p>
            <p className="text-[12px] text-slate-500">
              {t.lastActivity.replace("{date}", new Date(`${lastActivity(p, opcId)}T12:00:00`).toLocaleDateString(locale))}
            </p>
          </button>
        ))
      )}
    </div>
  );
}

function LeadProjectDetail({ project, opcId, onBack }: { project: LeadProject; opcId: string; onBack: () => void }) {
  const { m, locale } = useI18n();
  const t = m.earnNow.projectLead.projects;
  const [thread, setThread] = useState<LeadThreadTurn[]>(() => readLeadThread(opcId, project.id));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  useEffect(() => { writeLeadThread(opcId, project.id, thread); }, [opcId, project.id, thread]);

  async function send() {
    const text = sanitizeUntrustedText(input, { max: CHAT_TEXT_MAX, redactEmails: false, allowNewlines: false });
    if (!text || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setInput("");
    const withUser = appendLeadTurn(thread, { role: "user", content: text, at: new Date().toISOString() });
    setThread(withUser);
    try {
      const reply = await completeChat({
        system: leadProjectSystemPrompt(project),
        messages: leadThreadContext(withUser),
      });
      setThread((prev) => appendLeadTurn(prev, { role: "assistant", content: reply, at: new Date().toISOString() }));
    } catch {
      // Honest fallback: no fake reply is added; the chef's message stays in the thread.
      setError(t.chatError);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const stepMark = { done: "✅", current: "🔵", todo: "⏳" } as const;
  const stepLabel = { done: t.stepDone, current: t.stepCurrent, todo: t.stepTodo } as const;

  return (
    <div className="grid gap-3" data-lead-projects="detail" data-lead-project-detail={project.id}>
      <div>
        <button type="button" className={ghost} onClick={onBack} data-lead-project-back>{t.back}</button>
      </div>
      <section className={card}>
        <p className="flex items-center gap-2">
          <span className="text-[12px] font-bold uppercase tracking-wide text-slate-500">
            {t.projectNumber.replace("{n}", String(project.number))}
          </span>
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-bold text-emerald-900">
            {t.statuses[project.status]}
          </span>
        </p>
        <h3 className="text-[17px] font-extrabold">{project.title}</h3>
        <p className="text-[13px] text-slate-700">
          {t.clientCode} : <b>{project.clientCode || t.clientCodePending}</b>
        </p>
        <h4 className="text-[13px] font-extrabold">{t.summaryTitle}</h4>
        <p className="text-[13px] leading-snug text-slate-700">{project.summary}</p>
      </section>

      <section className={card} data-lead-project-steps>
        <h4 className="text-[14px] font-extrabold">{t.stepsTitle}</h4>
        <ul className="grid gap-2">
          {project.steps.map((s) => (
            <li key={s.label} className="flex items-start gap-2 text-[13px]" data-lead-project-step={s.state}>
              <span aria-hidden="true">{stepMark[s.state]}</span>
              <span>{s.label}</span>
              <span className="ml-auto shrink-0 text-[12px] font-bold text-slate-500">{stepLabel[s.state]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} data-lead-project-spec>
        <h4 className="text-[14px] font-extrabold">{t.specTitle}</h4>
        {project.spec ? (
          <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-snug text-slate-800">{project.spec}</pre>
        ) : (
          <p className="text-[13px] leading-snug text-slate-700">{t.specPending}</p>
        )}
      </section>

      <section className={card} data-lead-project-chat>
        <h4 className="text-[14px] font-extrabold">{t.chatTitle}</h4>
        <p className="text-[13px] leading-snug text-slate-700">{t.chatLead}</p>
        {thread.length === 0 ? (
          <p className="text-[13px] italic text-slate-500" data-lead-chat-empty>{t.chatEmpty}</p>
        ) : (
          <ul className="grid gap-2">
            {thread.map((turn, i) => (
              <li
                key={`${turn.at}-${i}`}
                className={`rounded-xl p-2 text-[13px] leading-snug ${turn.role === "user" ? "bg-sky-50" : "bg-slate-100"}`}
                data-lead-chat-msg={turn.role}
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {turn.role === "user" ? t.chatYou : t.chatAi}
                  {turn.at ? ` · ${new Date(turn.at).toLocaleString(locale)}` : ""}
                </p>
                <p className="whitespace-pre-wrap break-words">{turn.content}</p>
              </li>
            ))}
          </ul>
        )}
        {error ? <p role="alert" className="rounded-xl bg-rose-50 p-2 text-[13px] font-bold text-rose-900" data-lead-chat-error>{error}</p> : null}
        <form
          className="grid gap-2"
          onSubmit={(e) => { e.preventDefault(); void send(); }}
          data-lead-chat-form
        >
          <label className="grid gap-1 text-[13px]">
            <span className="sr-only">{t.chatPlaceholder}</span>
            <textarea
              className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-[15px] text-slate-900"
              placeholder={t.chatPlaceholder}
              value={input}
              maxLength={CHAT_TEXT_MAX}
              onChange={(e) => setInput(e.target.value)}
              data-lead-chat-input
            />
          </label>
          <button type="submit" className={primary} disabled={busy || !input.trim()} data-lead-chat-send>
            {busy ? t.chatSending : t.chatSend}
          </button>
        </form>
      </section>
    </div>
  );
}

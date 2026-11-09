"use client";

/**
 * « Test de l'équipe — propositions » — questionnaire d'accueil des chefs.
 *
 * Panneau du test d'accueil, affiché dans « Mes projets » sur le DOSSIER
 * assigné au chef vérifié (le parent, LeadProjectsBoard, ne le rend que
 * pour le dossier de SON assignation — src/lib/lead-test-propositions.ts :
 * pour Steve et Alex, leur vrai projet ; pour un futur chef, le dossier
 * modèle que l'équipe lui a assigné).
 *
 * Mécanique : 12 propositions, une nouvelle toutes les 15 minutes à partir
 * du début PROPRE au chef (sa date d'assignation) ; les propositions
 * ouvertes non répondues restent répondables ; la fenêtre se ferme 6
 * heures après son début (score final). La suggestion de l'IA est visible
 * AVANT de répondre — c'est le principe du test : apprendre à la suivre,
 * sauf raison concrète contraire. Chaque réponse est conservée sur
 * l'appareil (localStorage) et signalée au Worker (/lead-test-answer),
 * qui courrielle l'équipe Essaim-Agents pour son évaluation ; un
 * signalement échoué est renvoyé au prochain chargement. Le statut du
 * chef (« En test » / « Confirmé ») suit l'évaluation de l'équipe,
 * consignée dans son assignation.
 *
 * LANGUE : français seulement, volontairement hors i18n — section interne
 * des chefs de projet, chefs francophones.
 */
import { useEffect, useRef, useState } from "react";
import {
  LEAD_TEST_REASON_MAX,
  LEAD_TEST_TOTAL,
  flushUnsentLeadTestAnswers,
  leadTestChiefStatus,
  leadTestNextUnlockMs,
  leadTestPhase,
  leadTestPropState,
  leadTestScore,
  leadTestStartMsFor,
  leadTestUnlockAtMs,
  readLeadTestAnswers,
  writeLeadTestAnswers,
  type LeadTestAnswer,
  type LeadTestAnswers,
} from "@/lib/lead-test";
import {
  LEAD_TEST_CHOICES,
  type LeadTestAssignment,
  type LeadTestChoice,
  type LeadTestProjectTest,
} from "@/lib/lead-test-propositions";
import type { LeadProject } from "@/lib/lead-projects";

const card = "grid gap-3 rounded-2xl bg-white p-3 text-left text-slate-900";

function fmtClock(ms: number): string {
  return new Date(ms).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
}

function fmtCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, "0")} min`;
  if (minutes > 0) return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
  return `${seconds} s`;
}

/** Fusionne les confirmations d'envoi (sent) sans jamais effacer une réponse plus récente. */
function mergeSentFlags(prev: LeadTestAnswers, flushed: LeadTestAnswers): LeadTestAnswers {
  let changed = false;
  const next: LeadTestAnswers = { ...prev };
  for (const [key, answer] of Object.entries(flushed)) {
    const current = next[key];
    if (current && !current.sent && answer.sent && current.choice === answer.choice) {
      next[key] = { ...current, sent: true };
      changed = true;
    }
  }
  return changed ? next : prev;
}

export function LeadTestPanel({
  test,
  project,
  opcId,
  assignment,
  chefName = "",
}: {
  test: LeadTestProjectTest;
  project: LeadProject;
  opcId: string;
  assignment: LeadTestAssignment;
  chefName?: string;
}) {
  const startMs = leadTestStartMsFor(assignment);
  const [answers, setAnswers] = useState<LeadTestAnswers>(() => readLeadTestAnswers(opcId, project.id));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const flushBusyRef = useRef(false);

  // Horloge douce : la cadence est de 15 minutes, un tic toutes les 20 s suffit.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    writeLeadTestAnswers(opcId, project.id, answers);
  }, [opcId, project.id, answers]);

  // Au chargement : renvoyer à l'équipe les réponses dont le signalement avait échoué.
  useEffect(() => {
    let live = true;
    void flushUnsentLeadTestAnswers(
      opcId,
      project.id,
      readLeadTestAnswers(opcId, project.id),
      fetch,
      chefName,
    ).then((flushed) => {
      if (live) setAnswers((prev) => mergeSentFlags(prev, flushed));
    });
    return () => {
      live = false;
    };
    // Une seule fois au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function flush(current: LeadTestAnswers) {
    if (flushBusyRef.current) return;
    flushBusyRef.current = true;
    try {
      const flushed = await flushUnsentLeadTestAnswers(opcId, project.id, current, fetch, chefName);
      setAnswers((prev) => mergeSentFlags(prev, flushed));
    } finally {
      flushBusyRef.current = false;
    }
  }

  function answer(n: number, choice: LeadTestChoice, suggestion: LeadTestChoice) {
    const draft = (drafts[String(n)] ?? "").trim();
    const entry: LeadTestAnswer = {
      n,
      choice,
      // La raison ne sert qu'à expliquer un écart avec la suggestion.
      reason: choice === suggestion ? "" : draft.slice(0, LEAD_TEST_REASON_MAX),
      at: new Date().toISOString(),
      sent: false,
    };
    const next: LeadTestAnswers = { ...answers, [String(n)]: entry };
    setAnswers(next);
    void flush(next);
  }

  const phase = leadTestPhase(nowMs, startMs);
  const score = leadTestScore(test, answers);
  const status = leadTestChiefStatus(assignment, test, answers);
  const nextUnlock = leadTestNextUnlockMs(nowMs, startMs);

  return (
    <section className={card} data-lead-test="panel" data-lead-test-project={project.id}>
      <div className="flex items-center gap-2">
        <h4 className="text-[14px] font-extrabold">Test de l’équipe — propositions</h4>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[12px] font-bold ${
            status.state === "confirme"
              ? "bg-emerald-100 text-emerald-900"
              : "bg-amber-100 text-amber-900"
          }`}
          data-lead-test-status={status.state}
        >
          {status.state === "confirme" ? "Confirmé" : "En test"}
        </span>
      </div>
      <p className="text-[13px] leading-snug text-slate-700">
        Questionnaire d’accueil des chefs de projet, sur ce dossier
        {test.chefOpcId === opcId.trim().toUpperCase() ? "" : " modèle"} : 12 propositions. Pour
        chacune, l’IA du projet
        te donne sa suggestion <b>avant</b> que tu répondes. Suis-la, sauf si tu as une raison
        concrète de faire autrement — dis-la alors en une ligne. Tes réponses sont envoyées à
        l’équipe, qui évalue ta façon de suivre les instructions de l’IA.
      </p>

      <div className="rounded-xl bg-slate-100 p-2" data-lead-test-score>
        <p className="text-[13px] font-bold">
          Répondues : {score.answered}/{LEAD_TEST_TOTAL} · Suggestions suivies : {score.followed}
        </p>
        {status.state === "confirme" ? (
          <p className="text-[13px] font-bold text-emerald-900" data-lead-test-confirmed>
            ✅ L’équipe a confirmé ton test — tu peux débuter ton travail de chef de projet.
          </p>
        ) : phase === "before" ? (
          <p className="text-[13px] text-slate-700">
            Ton test commence à {fmtClock(startMs)} — première proposition dans{" "}
            {fmtCountdown(startMs - nowMs)}.
          </p>
        ) : phase === "open" && nextUnlock !== null ? (
          <p className="text-[13px] text-slate-700">
            Prochaine proposition à {fmtClock(nextUnlock)} (dans {fmtCountdown(nextUnlock - nowMs)}).
          </p>
        ) : phase === "open" ? (
          <p className="text-[13px] text-slate-700">
            Toutes les propositions sont ouvertes — réponds à celles qui restent avant la fin du test.
          </p>
        ) : status.complete ? (
          <p className="text-[13px] font-bold" data-lead-test-final>
            Test terminé — 12/12 réponses données. L’équipe évalue ton dossier ; ton statut passera
            à « Confirmé » quand elle aura donné satisfaction.
          </p>
        ) : (
          <p className="text-[13px] font-bold" data-lead-test-final>
            Test terminé — score final : {score.answered}/{LEAD_TEST_TOTAL} répondues,{" "}
            {score.followed} suggestion{score.followed > 1 ? "s" : ""} suivie
            {score.followed > 1 ? "s" : ""}. L’équipe évalue ton dossier.
          </p>
        )}
      </div>

      <div className="grid gap-3">
        {test.propositions.map((proposition) => {
          const entry = answers[String(proposition.n)];
          const state = leadTestPropState(proposition.n, Boolean(entry), nowMs, startMs);
          if (state === "locked") {
            return (
              <div
                key={proposition.n}
                className="rounded-xl border border-dashed border-slate-300 p-3 text-slate-500"
                data-lead-test-prop={proposition.n}
                data-lead-test-state="locked"
              >
                <p className="text-[13px] font-bold">
                  Proposition nº {proposition.n}/{LEAD_TEST_TOTAL} — se déverrouille à{" "}
                  {fmtClock(leadTestUnlockAtMs(proposition.n, startMs))}
                </p>
              </div>
            );
          }
          return (
            <article
              key={proposition.n}
              className="grid gap-2 rounded-xl border border-slate-200 p-3"
              data-lead-test-prop={proposition.n}
              data-lead-test-state={state}
            >
              <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500">
                Proposition nº {proposition.n}/{LEAD_TEST_TOTAL}
              </p>
              <p className="whitespace-pre-wrap text-[14px] leading-snug">{proposition.prompt}</p>
              <p className="rounded-xl bg-sky-50 p-2 text-[13px] leading-snug" data-lead-test-suggestion>
                <b>Suggestion de l’IA : {proposition.suggestion}</b> — {proposition.suggestionReason}
              </p>

              {state === "answered" && entry ? (
                <div data-lead-test-feedback>
                  <p className="text-[13px] font-bold">
                    Ta réponse : {entry.choice}.{" "}
                    {entry.choice === proposition.suggestion
                      ? "✅ Suggestion suivie."
                      : `⚠️ Choix différent de la suggestion (${proposition.suggestion}).`}
                  </p>
                  {entry.reason ? (
                    <p className="text-[13px] text-slate-700">Ta raison : {entry.reason}</p>
                  ) : null}
                  {!entry.sent ? (
                    <p className="text-[12px] text-slate-500">
                      Signalement à l’équipe en attente — il repartira tout seul.
                    </p>
                  ) : null}
                </div>
              ) : state === "expired" ? (
                <p className="text-[13px] font-bold text-slate-500">Expirée — sans réponse.</p>
              ) : (
                <>
                  <label className="grid gap-1 text-[13px]">
                    <span className="text-slate-600">
                      Si ton choix diffère de la suggestion, dis pourquoi en une ligne (optionnel) :
                    </span>
                    <input
                      type="text"
                      className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-[15px] text-slate-900"
                      maxLength={LEAD_TEST_REASON_MAX}
                      value={drafts[String(proposition.n)] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [String(proposition.n)]: e.target.value }))
                      }
                      data-lead-test-reason={proposition.n}
                    />
                  </label>
                  <div className="grid gap-2">
                    {LEAD_TEST_CHOICES.map((letter) => (
                      <button
                        key={letter}
                        type="button"
                        className="tap flex min-h-14 items-center gap-3 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-left active:bg-slate-100"
                        onClick={() => answer(proposition.n, letter, proposition.suggestion)}
                        data-lead-test-choice={letter}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[15px] font-extrabold text-white">
                          {letter}
                        </span>
                        <span className="text-[14px] leading-snug">{proposition.choices[letter]}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

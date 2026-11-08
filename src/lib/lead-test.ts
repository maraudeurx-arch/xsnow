/**
 * « Test des chefs de projet » (08/11/2026) — mécanique du test.
 *
 * Les propositions vivent dans src/lib/lead-test-propositions.ts (données).
 * Ici : l'horaire de déverrouillage, la persistance sur l'appareil du chef
 * (localStorage, une clé par chef et par projet — même patron que le fil de
 * discussion, src/lib/lead-project-chat.ts), le signalement de chaque réponse
 * au Worker (route /lead-test-answer, qui courrielle l'équipe Essaim-Agents)
 * et la validation côté serveur de ce signalement (liste blanche stricte :
 * le serveur recalcule lui-même la suggestion et le « suivi ou non » depuis
 * la banque des propositions — il ne fait pas confiance au client).
 */
import { IDEA_INBOX_POST_TIMEOUT_MS, ideasInboxEndpoint, type IdeaInboxPostResult } from "./idea-inbox.ts";
import { ESSAIM_AGENTS_INBOX_TO, clipOpcId, type OwnerMail } from "./owner-mail.ts";
import { sanitizeUntrustedText } from "./sanitize.ts";
import {
  LEAD_TEST_START_ISO,
  leadTestForProject,
  type LeadTestChoice,
  type LeadTestProjectTest,
} from "./lead-test-propositions.ts";

/** Début du test (voir lead-test-propositions.ts — un seul endroit nommé). */
export const LEAD_TEST_START_MS = Date.parse(LEAD_TEST_START_ISO);
/** Nombre de propositions par chef. */
export const LEAD_TEST_TOTAL = 12;
/** Une nouvelle proposition toutes les 15 minutes. */
export const LEAD_TEST_STEP_MS = 15 * 60_000;
/** La fenêtre du test : 6 heures après le début, le score est final. */
export const LEAD_TEST_WINDOW_MS = 6 * 3_600_000;
export const LEAD_TEST_END_MS = LEAD_TEST_START_MS + LEAD_TEST_WINDOW_MS;

/* ------------------------------------------------------------------ */
/* Horaire de déverrouillage (fonctions pures, testées)                */
/* ------------------------------------------------------------------ */

export type LeadTestPhase = "before" | "open" | "closed";

export function leadTestPhase(nowMs: number): LeadTestPhase {
  if (nowMs < LEAD_TEST_START_MS) return "before";
  if (nowMs < LEAD_TEST_END_MS) return "open";
  return "closed";
}

/** Instant (ms) où la proposition nº n se déverrouille. */
export function leadTestUnlockAtMs(n: number): number {
  return LEAD_TEST_START_MS + (n - 1) * LEAD_TEST_STEP_MS;
}

/** Nombre de propositions déverrouillées à cet instant (0 à 12). */
export function leadTestUnlockedCount(nowMs: number): number {
  if (nowMs < LEAD_TEST_START_MS) return 0;
  const elapsed = Math.floor((nowMs - LEAD_TEST_START_MS) / LEAD_TEST_STEP_MS) + 1;
  return Math.min(LEAD_TEST_TOTAL, Math.max(0, elapsed));
}

/** Instant du prochain déverrouillage, ou null si tout est déverrouillé / fermé. */
export function leadTestNextUnlockMs(nowMs: number): number | null {
  const unlocked = leadTestUnlockedCount(nowMs);
  if (unlocked >= LEAD_TEST_TOTAL || leadTestPhase(nowMs) === "closed") return null;
  return leadTestUnlockAtMs(unlocked + 1);
}

export type LeadTestPropState = "locked" | "open" | "answered" | "expired";

/**
 * État d'une proposition : verrouillée avant son heure, répondable ensuite
 * (les déverrouillées non répondues s'empilent), expirée quand la fenêtre
 * de 6 heures se ferme sans réponse.
 */
export function leadTestPropState(n: number, answered: boolean, nowMs: number): LeadTestPropState {
  if (answered) return "answered";
  if (nowMs >= LEAD_TEST_END_MS) return "expired";
  if (nowMs < leadTestUnlockAtMs(n)) return "locked";
  return "open";
}

/* ------------------------------------------------------------------ */
/* Réponses : persistance locale + score                               */
/* ------------------------------------------------------------------ */

export type LeadTestAnswer = {
  n: number;
  choice: LeadTestChoice;
  /** Raison d'un écart, si le chef en a donné une (une ligne, optionnelle). */
  reason: string;
  /** Horodatage ISO de la réponse. */
  at: string;
  /** true quand le Worker a confirmé la réception (courriel à l'équipe envoyé). */
  sent: boolean;
};

/** Réponses indexées par numéro de proposition (clé = String(n)). */
export type LeadTestAnswers = Record<string, LeadTestAnswer>;

export const LEAD_TEST_KEY_PREFIX = "opc.leadProjects.test.v1";
/** Longueur maximale de la raison d'un écart (une ligne). */
export const LEAD_TEST_REASON_MAX = 200;

export function leadTestStorageKey(opcId: string, projectId: string): string {
  return `${LEAD_TEST_KEY_PREFIX}.${opcId.trim().toUpperCase()}.${projectId}`;
}

export function isLeadTestChoice(raw: unknown): raw is LeadTestChoice {
  return raw === "A" || raw === "B" || raw === "C";
}

export function clipLeadTestReason(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return sanitizeUntrustedText(raw, {
    max: LEAD_TEST_REASON_MAX,
    redactEmails: false,
    allowNewlines: false,
  });
}

/** Validation des réponses relues du stockage local (jamais de confiance aveugle). */
export function parseLeadTestAnswers(raw: unknown, test: LeadTestProjectTest): LeadTestAnswers {
  const out: LeadTestAnswers = {};
  if (!raw || typeof raw !== "object") return out;
  for (const item of Object.values(raw as Record<string, unknown>)) {
    if (!item || typeof item !== "object") continue;
    const record = item as { n?: unknown; choice?: unknown; reason?: unknown; at?: unknown; sent?: unknown };
    if (typeof record.n !== "number" || !Number.isInteger(record.n)) continue;
    if (!test.propositions.some((p) => p.n === record.n)) continue;
    if (!isLeadTestChoice(record.choice)) continue;
    out[String(record.n)] = {
      n: record.n,
      choice: record.choice,
      reason: clipLeadTestReason(record.reason),
      at: typeof record.at === "string" && record.at ? record.at : "",
      sent: record.sent === true,
    };
  }
  return out;
}

export function readLeadTestAnswers(opcId: string, projectId: string): LeadTestAnswers {
  const test = leadTestForProject(projectId);
  if (!test) return {};
  try {
    const raw = localStorage.getItem(leadTestStorageKey(opcId, projectId));
    return raw ? parseLeadTestAnswers(JSON.parse(raw), test) : {};
  } catch {
    return {};
  }
}

export function writeLeadTestAnswers(opcId: string, projectId: string, answers: LeadTestAnswers) {
  try {
    localStorage.setItem(leadTestStorageKey(opcId, projectId), JSON.stringify(answers));
  } catch {
    /* mode privé / quota : la progression n'est simplement pas conservée */
  }
}

/** Score en direct : propositions répondues et suggestions suivies. */
export function leadTestScore(
  test: LeadTestProjectTest,
  answers: LeadTestAnswers,
): { answered: number; followed: number } {
  let answered = 0;
  let followed = 0;
  for (const proposition of test.propositions) {
    const answer = answers[String(proposition.n)];
    if (!answer) continue;
    answered += 1;
    if (answer.choice === proposition.suggestion) followed += 1;
  }
  return { answered, followed };
}

/* ------------------------------------------------------------------ */
/* Signalement au Worker (une réponse = un courriel à l'équipe)        */
/* ------------------------------------------------------------------ */

/** Ce que le client envoie : le strict nécessaire ; le serveur recalcule le reste. */
export type LeadTestReportInput = {
  opcId: string;
  projectId: string;
  n: number;
  choice: LeadTestChoice;
  reason: string;
  at: string;
};

/** Signalement validé et enrichi côté serveur (source du courriel à l'équipe). */
export type LeadTestReport = {
  opcId: string;
  chefName: string;
  projectId: string;
  projectNumber: number;
  projectTitle: string;
  n: number;
  choice: LeadTestChoice;
  suggested: LeadTestChoice;
  followed: boolean;
  reason: string;
  answeredAt: string;
};

export function leadTestReportInput(opcId: string, projectId: string, answer: LeadTestAnswer): LeadTestReportInput {
  return {
    opcId: opcId.trim().toUpperCase(),
    projectId,
    n: answer.n,
    choice: answer.choice,
    reason: answer.reason,
    at: answer.at,
  };
}

/**
 * Validation côté serveur d'un signalement. Le code OPC doit être celui du
 * chef rattaché au projet, la proposition doit exister, et la suggestion /
 * le « suivi » sont recalculés depuis la banque — jamais pris du client.
 */
export function parseLeadTestReport(raw: unknown): LeadTestReport | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const opcId = clipOpcId(record.opcId);
  if (!opcId) return null;
  const test = leadTestForProject(record.projectId);
  if (!test || test.chefOpcId !== opcId) return null;
  if (typeof record.n !== "number" || !Number.isInteger(record.n)) return null;
  const proposition = test.propositions.find((p) => p.n === record.n);
  if (!proposition) return null;
  if (!isLeadTestChoice(record.choice)) return null;
  const answeredAt =
    typeof record.at === "string" && record.at && !Number.isNaN(Date.parse(record.at))
      ? new Date(record.at).toISOString()
      : "";
  return {
    opcId,
    chefName: test.chefName,
    projectId: test.projectId,
    projectNumber: test.projectNumber,
    projectTitle: test.projectTitle,
    n: proposition.n,
    choice: record.choice,
    suggested: proposition.suggestion,
    followed: record.choice === proposition.suggestion,
    reason: clipLeadTestReason(record.reason),
    answeredAt,
  };
}

/** Courriel à l'équipe Essaim-Agents pour UNE réponse du test. */
export function buildLeadTestAnswerMail(report: LeadTestReport, now = Date.now()): OwnerMail {
  const subject = `OPC test chef — ${report.chefName} — proposition ${report.n}/${LEAD_TEST_TOTAL}`;
  const text = [
    "Test des chefs de projet OPC — une réponse vient d'arriver.",
    "",
    `Chef : ${report.chefName} (${report.opcId})`,
    `Projet : ${report.projectTitle} (projet nº ${report.projectNumber})`,
    `Proposition : ${report.n}/${LEAD_TEST_TOTAL}`,
    `Choix du chef : ${report.choice}`,
    `Suggestion de l'IA : ${report.suggested}`,
    `Suggestion suivie : ${report.followed ? "oui" : "non"}`,
    `Raison de l'écart : ${report.reason || "(aucune)"}`,
    `Répondu le : ${report.answeredAt || "(horodatage non fourni)"}`,
    `Signalé le : ${new Date(now).toISOString()}`,
    "",
    "— Test de formation du 8 novembre 2026 : le chef apprend à suivre les suggestions de l'IA de son projet.",
  ].join("\n");
  return { subject, text, to: ESSAIM_AGENTS_INBOX_TO };
}

export function leadTestAnswerEndpoint(base?: string): string {
  return ideasInboxEndpoint(base).replace(/\/ideas$/, "/lead-test-answer");
}

/** Envoi d'UNE réponse au Worker. « sent » seulement si le courriel à l'équipe est parti. */
export async function postLeadTestAnswer(
  input: LeadTestReportInput,
  fetchImpl: typeof fetch = fetch,
): Promise<IdeaInboxPostResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IDEA_INBOX_POST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(leadTestAnswerEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) return "failed";
    const payload = (await response.json().catch(() => null)) as { ok?: unknown; emailed?: unknown } | null;
    return payload && payload.ok === true && payload.emailed === true ? "sent" : "failed";
  } catch {
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Renvoie au Worker toutes les réponses pas encore confirmées (envoi échoué
 * ou interrompu) et retourne l'état mis à jour (sent = true pour celles que
 * le Worker a confirmées). Utilisé au chargement du panneau et après chaque
 * nouvelle réponse.
 */
export async function flushUnsentLeadTestAnswers(
  opcId: string,
  projectId: string,
  answers: LeadTestAnswers,
  fetchImpl: typeof fetch = fetch,
): Promise<LeadTestAnswers> {
  const pending = Object.values(answers)
    .filter((answer) => !answer.sent)
    .sort((a, b) => a.n - b.n);
  if (pending.length === 0) return answers;
  const next: LeadTestAnswers = { ...answers };
  for (const answer of pending) {
    const result = await postLeadTestAnswer(leadTestReportInput(opcId, projectId, answer), fetchImpl);
    if (result === "sent") {
      next[String(answer.n)] = { ...answer, sent: true };
    }
  }
  return next;
}

/**
 * Copy of an arbiter's own decision, emailed to the arbiter (Resend, same API as OPC owner mail).
 * OFF unless env ARBITER_DECISION_EMAILS === "on". D1 keeps the record either way.
 */
import { OPC_DIRECTION_EMAIL } from "../../../src/lib/arb-checklist.ts";
import { RESEND_API_URL, resolveFromAddress } from "../../../src/lib/owner-mail.ts";
import { MANUEL_JUSTICE_PAGE_URL, MANUEL_JUSTICE_PDF_URL, normalizeEmailInput } from "../../../src/lib/arbitrage.ts";

export type MailLang = "fr" | "en" | "es";
export type DecisionCopy = {
  caseId: string; title: string; simulation: boolean; choice: string;
  suggestion: string | null; followedSuggestion: boolean | null; decidedAt: string;
  /** Indiana's training explanation (French, simple, with the Manuel excerpt). Optional. */
  explanation?: string | null;
};

const L = {
  fr: { contact: "Une question, une suggestion ? Écris-nous :", sign: "La direction d’OPC", subj: "Copie de ta décision d’arbitrage", sim: "SIMULATION — aucun vrai litige, aucun paiement.", case: "Dossier", id: "Numéro", choice: "Ta décision", sugg: "Suggestion", followed: "Tu as suivi la suggestion.", contra: "Tu n’as pas suivi la suggestion.", at: "Date (UTC)", why: "Pourquoi — la formation d’Indiana :", manual: "Manuel de justice", keep: "Cette décision est conservée dans OPC comme preuve. Ne réponds pas à ce courriel." },
  en: { contact: "A question, a suggestion? Write to us:", sign: "OPC management", subj: "Copy of your arbitration decision", sim: "SIMULATION — no real dispute, no payment.", case: "Case", id: "ID", choice: "Your decision", sugg: "Suggestion", followed: "You followed the suggestion.", contra: "You did not follow the suggestion.", at: "Date (UTC)", why: "Why — Indiana’s training (in French):", manual: "Justice Manual", keep: "This decision is kept in OPC as a record. Do not reply to this email." },
  es: { contact: "¿Una pregunta, una sugerencia? Escríbenos:", sign: "La dirección de OPC", subj: "Copia de tu decisión de arbitraje", sim: "SIMULACIÓN — ninguna disputa real, ningún pago.", case: "Caso", id: "Número", choice: "Tu decisión", sugg: "Sugerencia", followed: "Seguiste la sugerencia.", contra: "No seguiste la sugerencia.", at: "Fecha (UTC)", why: "Por qué — la formación de Indiana (en francés):", manual: "Manual de justicia", keep: "Esta decisión se conserva en OPC como prueba. No respondas a este correo." },
} as const;

export const ARB_EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
export function parseArbiterEmail(raw: unknown): string {
  const e = typeof raw === "string" ? normalizeEmailInput(raw) : "";
  return e.length <= 254 && ARB_EMAIL_RE.test(e) ? e : "";
}
export function parseMailLang(raw: unknown): MailLang {
  return raw === "en" || raw === "es" ? raw : "fr";
}

export function decisionMail(d: DecisionCopy, lang: MailLang): { subject: string; text: string } {
  const t = L[lang];
  const lines = [
    ...(d.simulation ? [t.sim, ""] : []),
    `${t.case} : ${d.title}`,
    `${t.id} : ${d.caseId}`,
    `${t.choice} : ${d.choice}`,
    ...(d.suggestion ? [`${t.sugg} : ${d.suggestion}`] : []),
    ...(d.followedSuggestion === null ? [] : [d.followedSuggestion ? t.followed : t.contra]),
    `${t.at} : ${d.decidedAt}`,
    ...(d.explanation ? ["", t.why, d.explanation] : []),
    "",
    `${t.manual} : ${MANUEL_JUSTICE_PDF_URL}`,
    MANUEL_JUSTICE_PAGE_URL,
    "",
    t.keep,
    "",
    `${t.contact} ${OPC_DIRECTION_EMAIL}`,
    "",
    t.sign,
  ];
  return { subject: `${d.simulation ? "[SIMULATION] " : ""}${t.subj} — ${d.caseId}`, text: lines.join("\n") };
}

export type MailEnv = { ARBITER_DECISION_EMAILS?: string; RESEND_API_KEY?: string; IDEAS_FROM_EMAIL?: string };

/** Log-safe text: no email addresses, no bearer/API keys, single line, truncated. */
export function redactForLog(s: string, max = 300): string {
  return s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/re_[A-Za-z0-9_]{8,}/g, "[key]").replace(/Bearer\s+\S+/gi, "Bearer [key]")
    .replace(/\s+/g, " ").slice(0, max);
}

/** Returns "off" | "no_email" | "sent" | "failed". Never throws. Logs one redacted line per attempt. */
export async function sendDecisionCopy(env: MailEnv, to: string | null, lang: MailLang, d: DecisionCopy, fetchImpl: typeof fetch,
  log: (line: string) => void = (l) => console.log(l)): Promise<string> {
  const tag = `decision-copy case=${d.caseId} sim=${d.simulation ? 1 : 0}`;
  if (env.ARBITER_DECISION_EMAILS !== "on") { log(`${tag} result=off reason=flag`); return "off"; }
  if (!env.RESEND_API_KEY) { log(`${tag} result=off reason=no_resend_key`); return "off"; }
  if (!to) { log(`${tag} result=no_email`); return "no_email"; }
  const m = decisionMail(d, lang);
  try {
    const r = await fetchImpl(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: resolveFromAddress(env.IDEAS_FROM_EMAIL), to: [to], subject: m.subject, text: m.text }),
    });
    const body = redactForLog(await r.text().catch(() => ""));
    log(`${tag} result=${r.ok ? "sent" : "failed"} resend_status=${r.status} body=${body}`);
    return r.ok ? "sent" : "failed";
  } catch (e) {
    log(`${tag} result=failed resend_status=0 error=${redactForLog(String(e))}`);
    return "failed";
  }
}

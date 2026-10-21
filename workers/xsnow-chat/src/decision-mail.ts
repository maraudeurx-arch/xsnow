/**
 * Copy of an arbiter's own decision, emailed to the arbiter (Resend, same API as OPC owner mail).
 * OFF unless env ARBITER_DECISION_EMAILS === "on". D1 keeps the record either way.
 */
import { RESEND_API_URL, resolveFromAddress } from "../../../src/lib/owner-mail.ts";
import { MANUEL_JUSTICE_PAGE_URL, MANUEL_JUSTICE_PDF_URL, normalizeEmailInput } from "../../../src/lib/arbitrage.ts";

export type MailLang = "fr" | "en" | "es";
export type DecisionCopy = {
  caseId: string; title: string; simulation: boolean; choice: string;
  suggestion: string | null; followedSuggestion: boolean | null; decidedAt: string;
};

const L = {
  fr: { subj: "Copie de ta décision d’arbitrage", sim: "SIMULATION — aucun vrai litige, aucun paiement.", case: "Dossier", id: "Numéro", choice: "Ta décision", sugg: "Suggestion", followed: "Tu as suivi la suggestion.", contra: "Tu n’as pas suivi la suggestion.", at: "Date (UTC)", manual: "Manuel de justice", keep: "Cette décision est conservée dans OPC comme preuve. Ne réponds pas à ce courriel." },
  en: { subj: "Copy of your arbitration decision", sim: "SIMULATION — no real dispute, no payment.", case: "Case", id: "ID", choice: "Your decision", sugg: "Suggestion", followed: "You followed the suggestion.", contra: "You did not follow the suggestion.", at: "Date (UTC)", manual: "Justice Manual", keep: "This decision is kept in OPC as a record. Do not reply to this email." },
  es: { subj: "Copia de tu decisión de arbitraje", sim: "SIMULACIÓN — ninguna disputa real, ningún pago.", case: "Caso", id: "Número", choice: "Tu decisión", sugg: "Sugerencia", followed: "Seguiste la sugerencia.", contra: "No seguiste la sugerencia.", at: "Fecha (UTC)", manual: "Manual de justicia", keep: "Esta decisión se conserva en OPC como prueba. No respondas a este correo." },
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
    "",
    `${t.manual} : ${MANUEL_JUSTICE_PDF_URL}`,
    MANUEL_JUSTICE_PAGE_URL,
    "",
    t.keep,
  ];
  return { subject: `${d.simulation ? "[SIMULATION] " : ""}${t.subj} — ${d.caseId}`, text: lines.join("\n") };
}

export type MailEnv = { ARBITER_DECISION_EMAILS?: string; RESEND_API_KEY?: string; IDEAS_FROM_EMAIL?: string };

/** Returns "off" | "no_email" | "sent" | "failed". Never throws. */
export async function sendDecisionCopy(env: MailEnv, to: string | null, lang: MailLang, d: DecisionCopy, fetchImpl: typeof fetch): Promise<string> {
  if (env.ARBITER_DECISION_EMAILS !== "on" || !env.RESEND_API_KEY) return "off";
  if (!to) return "no_email";
  const m = decisionMail(d, lang);
  try {
    const r = await fetchImpl(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: resolveFromAddress(env.IDEAS_FROM_EMAIL), to: [to], subject: m.subject, text: m.text }),
    });
    return r.ok ? "sent" : "failed";
  } catch { return "failed"; }
}

/**
 * « Test des chefs de projet » — signalement des réponses (modèle permanent
 * d'accueil : dossiers modèles « Éducation » / « Haute couture », assignés
 * par l'équipe aux nouveaux chefs).
 * POST /lead-test-answer — une réponse du test (chef, projet, proposition,
 * choix) ; courrielle l'équipe Essaim-Agents (essaim.agents@gmail.com).
 *
 * Même patron que POST /register (voir ideas.ts) : corps validé par liste
 * blanche dans src/lib/lead-test.ts (le serveur recalcule la suggestion et
 * le « suivi ou non » depuis la banque des propositions), puis courriel via
 * Resend (sendOwnerMail). Rien n'est stocké : le score vit sur l'appareil du
 * chef (localStorage) et chaque réponse part aussi par courriel.
 */

import { buildLeadTestAnswerMail, parseLeadTestReport } from "../../../src/lib/lead-test.ts";
import { sendOwnerMail, type MailEnv, type OwnerMail } from "../../../src/lib/owner-mail.ts";

export type LeadTestEnv = MailEnv;

export type LeadTestMailer = (
  env: LeadTestEnv,
  mail: OwnerMail,
) => Promise<{ sent: boolean; reason?: string }>;

export function isLeadTestAnswerPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/lead-test-answer" || value.endsWith("/lead-test-answer");
}

export async function handleLeadTestAnswerPost(
  rawBody: unknown,
  env: LeadTestEnv,
  now = Date.now(),
  mailer: LeadTestMailer = sendOwnerMail,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const parsed = parseLeadTestReport(rawBody);
  if (!parsed) return { status: 400, data: { error: "bad_request" } };
  let emailed = false;
  try {
    const mail = await mailer(env, buildLeadTestAnswerMail(parsed, now));
    emailed = Boolean(mail.sent);
  } catch {
    emailed = false;
  }
  return { status: 200, data: { ok: true, emailed } };
}

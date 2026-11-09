/**
 * POST /idea-sale-confirmation — « Vendre mes idées » receipt e-mail to the
 * seller (Popol, 07/11/2026): their idea was received, with its title and
 * its number in their own « Mes idées proposées » list.
 *
 * Modeled on decision-mail.ts (e-mail to a user address, same Resend API
 * key and From as the OPC owner mail — no new secret) and ideas.ts (D1
 * `events` markers). OFF unless env IDEA_SALE_CONFIRM_EMAILS === "on".
 * Best-effort: the submission already succeeded before this is called,
 * and a failed or off confirmation changes nothing for the seller.
 *
 * No duplicate sends: before sending, the handler looks for a D1 marker
 * (type = idea_sale_confirmation, session_id = proposal id); the marker
 * is written only after a successful send, so the same submission can
 * never produce two confirmation e-mails, while a failed send stays
 * retryable.
 */

import {
  IDEA_SALE_CONFIRMATION_EVENT_TYPE,
  ideaSaleConfirmationMail,
  parseIdeaSaleConfirmation,
  type IdeaSaleConfirmation,
} from "../../../src/lib/idea-sale-confirmation.ts";
import { RESEND_API_URL, resolveFromAddress, type MailEnv } from "../../../src/lib/owner-mail.ts";
import { redactForLog } from "./decision-mail.ts";
import type { D1Like } from "./stats.ts";

export type IdeaSaleConfirmationEnv = MailEnv & {
  DB?: D1Like;
  /** "on" enables seller confirmation e-mails. Config flag, not a secret. */
  IDEA_SALE_CONFIRM_EMAILS?: string;
};

export function isIdeaSaleConfirmationPath(pathname: string) {
  const value = pathname.replace(/\/+$/, "") || "/";
  return value === "/idea-sale-confirmation" || value.endsWith("/idea-sale-confirmation");
}

const SELECT_MARKER = `SELECT session_id AS id FROM events WHERE type = ? AND session_id = ? LIMIT 1`;
const INSERT_MARKER = `INSERT INTO events (session_id, type, ts, lang, city, country_code, suggestion)
VALUES (?, ?, ?, ?, ?, ?, ?)`;

async function confirmationAlreadySent(db: D1Like, id: string): Promise<boolean> {
  try {
    const row = await db
      .prepare(SELECT_MARKER)
      .bind(IDEA_SALE_CONFIRMATION_EVENT_TYPE, id)
      .first<{ id: string }>();
    return Boolean(row?.id);
  } catch {
    return false;
  }
}

async function markConfirmationSent(
  db: D1Like,
  confirmation: IdeaSaleConfirmation,
  now: number,
): Promise<void> {
  try {
    await db.batch([
      db
        .prepare(INSERT_MARKER)
        .bind(confirmation.id, IDEA_SALE_CONFIRMATION_EVENT_TYPE, now, confirmation.lang, null, null, null),
    ]);
  } catch {
    // Marker is a duplicate guard, not the record of the sale proposal:
    // a failed write never fails the confirmation itself.
  }
}

export type IdeaSaleConfirmationSendResult = "off" | "sent" | "failed";

/** Never throws. Logs one redacted line per attempt (no address, no key). */
export async function sendIdeaSaleConfirmation(
  env: IdeaSaleConfirmationEnv,
  confirmation: IdeaSaleConfirmation,
  fetchImpl: typeof fetch = fetch,
  log: (line: string) => void = (l) => console.log(l),
): Promise<IdeaSaleConfirmationSendResult> {
  const tag = `idea-sale-confirmation id=${confirmation.id} n=${confirmation.number} lang=${confirmation.lang}`;
  if (env.IDEA_SALE_CONFIRM_EMAILS !== "on") {
    log(`${tag} result=off reason=flag`);
    return "off";
  }
  if (!env.RESEND_API_KEY) {
    log(`${tag} result=off reason=no_resend_key`);
    return "off";
  }
  const mail = ideaSaleConfirmationMail(confirmation, confirmation.lang);
  try {
    const response = await fetchImpl(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resolveFromAddress(env.IDEAS_FROM_EMAIL),
        to: [confirmation.email],
        subject: mail.subject,
        text: mail.text,
      }),
    });
    const body = redactForLog(await response.text().catch(() => ""));
    log(`${tag} result=${response.ok ? "sent" : "failed"} resend_status=${response.status} body=${body}`);
    return response.ok ? "sent" : "failed";
  } catch (error) {
    log(`${tag} result=failed resend_status=0 error=${redactForLog(String(error))}`);
    return "failed";
  }
}

export async function handleIdeaSaleConfirmationPost(
  rawBody: unknown,
  env: IdeaSaleConfirmationEnv,
  now = Date.now(),
  fetchImpl: typeof fetch = fetch,
  log: (line: string) => void = (l) => console.log(l),
): Promise<{ status: number; data: Record<string, unknown> }> {
  const parsed = parseIdeaSaleConfirmation(rawBody);
  if (!parsed) return { status: 400, data: { ok: false, error: "invalid" } };

  if (env.DB && (await confirmationAlreadySent(env.DB, parsed.id))) {
    return { status: 200, data: { ok: true, emailed: false, reason: "duplicate" } };
  }

  const result = await sendIdeaSaleConfirmation(env, parsed, fetchImpl, log);
  if (result === "sent" && env.DB) {
    await markConfirmationSent(env.DB, parsed, now);
  }
  return {
    status: 200,
    data: { ok: true, emailed: result === "sent", reason: result },
  };
}

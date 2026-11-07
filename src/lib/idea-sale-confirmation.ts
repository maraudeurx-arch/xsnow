/**
 * Confirmation e-mail for « Vendre mes idées » (Popol, 07/11/2026): when a
 * proposal is confirmed sent, the seller receives a short e-mail, in the
 * language of the form, saying the team received their idea — its title
 * and its number in their own « Mes idées proposées » list (« Idée nº 1 »,
 * the same numbering idea-sale-list.ts shows on-device).
 *
 * Plumbing: the client POSTs to the xsnow-chat Worker
 * (/idea-sale-confirmation), which sends through the existing Resend
 * configuration (same API key and From as the owner mail — no new
 * secret). The send is best-effort like every OPC notice: its failure
 * never blocks or invalidates the submission, whose on-screen « Merci »
 * is already shown. The Worker keeps a D1 marker per proposal id, so a
 * given submission can never trigger two confirmation e-mails.
 *
 * Content discipline (the section's honest texts): the team reads every
 * proposal and replies by e-mail if it is approved; if the idea sells,
 * the compensation is set by the team — no amount and no percentage is
 * promised in advance; until it sells, the idea remains its author's.
 */

import { ideasInboxEndpoint, IDEA_INBOX_POST_TIMEOUT_MS } from "./idea-inbox.ts";
import { IDEA_SALE_TITLE_MAX } from "./idea-sale.ts";
import { sanitizeProfileEmail } from "./local-profile.ts";
import { sanitizeRecordId, sanitizeUntrustedText } from "./sanitize.ts";

export const IDEA_SALE_CONFIRMATION_EVENT_TYPE = "idea_sale_confirmation";
export const IDEA_SALE_CONFIRMATION_NUMBER_MAX = 9_999;

export type IdeaSaleMailLang = "fr" | "en" | "es";

export function ideaSaleMailLang(raw: unknown): IdeaSaleMailLang {
  return raw === "en" || raw === "es" ? raw : "fr";
}

export type IdeaSaleConfirmation = {
  /** Proposal id — the Worker's duplicate-send guard keys on it. */
  id: string;
  email: string;
  title: string;
  /** Position in the seller's own list (1-based), as shown on-device. */
  number: number;
  lang: IdeaSaleMailLang;
};

export function parseIdeaSaleConfirmation(raw: unknown): IdeaSaleConfirmation | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = sanitizeRecordId(record.id) || "";
  const email = sanitizeProfileEmail(record.email);
  const title = sanitizeUntrustedText(record.title, { max: IDEA_SALE_TITLE_MAX });
  const number =
    typeof record.number === "number" && Number.isInteger(record.number) ? record.number : 0;
  if (!id || !email || !title) return null;
  if (number < 1 || number > IDEA_SALE_CONFIRMATION_NUMBER_MAX) return null;
  return { id, email, title, number, lang: ideaSaleMailLang(record.lang) };
}

const L = {
  fr: {
    subject: (n: number) => `Ton idée a bien été reçue — idée nº ${n}`,
    hello: "Bonjour,",
    received: (title: string) => `L’équipe d’Essaim-Agents a bien reçu ton idée « ${title} ».`,
    yours: (n: number) =>
      `C’est ton idée nº ${n} dans la section « Vendre mes idées » d’OPC : tu la retrouveras dans « Mes idées proposées » quand tu reviendras.`,
    next: "La suite : chaque proposition est relue par l’équipe d’Essaim-Agents. Si ton idée est approuvée, tu seras recontacté par courriel.",
    honest:
      "Si ton idée se vend, tu reçois une compensation fixée par l’équipe. Aucun montant ni pourcentage n’est promis à l’avance.",
    stays: "Tant qu’elle n’est pas vendue, ton idée reste la tienne.",
    sign: "L’équipe d’Essaim-Agents",
  },
  en: {
    subject: (n: number) => `Your idea has been received — idea no. ${n}`,
    hello: "Hello,",
    received: (title: string) => `The Essaim-Agents team has received your idea “${title}”.`,
    yours: (n: number) =>
      `It is your idea no. ${n} in OPC's “Sell my ideas” section: you will find it under “My submitted ideas” when you come back.`,
    next: "What happens next: every proposal is read by the Essaim-Agents team. If your idea is approved, you will be contacted by email.",
    honest:
      "If your idea sells, you receive compensation set by the team. No amount or percentage is promised in advance.",
    stays: "Until it sells, your idea remains yours.",
    sign: "The Essaim-Agents team",
  },
  es: {
    subject: (n: number) => `Tu idea ha sido recibida — idea n.º ${n}`,
    hello: "Hola,",
    received: (title: string) => `El equipo de Essaim-Agents ha recibido tu idea «${title}».`,
    yours: (n: number) =>
      `Es tu idea n.º ${n} en la sección «Vender mis ideas» de OPC: la encontrarás en «Mis ideas enviadas» cuando vuelvas.`,
    next: "Lo que sigue: cada propuesta la lee el equipo de Essaim-Agents. Si tu idea es aprobada, te contactarán por correo electrónico.",
    honest:
      "Si tu idea se vende, recibes una compensación fijada por el equipo. Ninguna cantidad ni porcentaje se promete por adelantado.",
    stays: "Mientras no se venda, tu idea sigue siendo tuya.",
    sign: "El equipo de Essaim-Agents",
  },
} as const;

export function ideaSaleConfirmationMail(
  input: { title: string; number: number },
  lang: IdeaSaleMailLang,
): { subject: string; text: string } {
  const t = L[lang];
  const lines = [
    t.hello,
    "",
    t.received(input.title),
    t.yours(input.number),
    "",
    t.next,
    t.honest,
    t.stays,
    "",
    t.sign,
  ];
  return { subject: t.subject(input.number), text: lines.join("\n") };
}

export function ideaSaleConfirmationEndpoint(base?: string) {
  return ideasInboxEndpoint(base).replace(/\/ideas$/, "/idea-sale-confirmation");
}

export type IdeaSaleConfirmationPostResult = "sent" | "failed";

/**
 * Best-effort POST of the confirmation request, mirroring
 * postRegisterNotice: resolves "sent" only when the Worker confirms the
 * e-mail went out, "failed" otherwise, and never throws.
 */
export async function postIdeaSaleConfirmation(
  input: { id: string; email: string; title: string; number: number; lang: string },
  fetchImpl: typeof fetch = fetch,
): Promise<IdeaSaleConfirmationPostResult> {
  const parsed = parseIdeaSaleConfirmation(input);
  if (!parsed) return "failed";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IDEA_INBOX_POST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(ideaSaleConfirmationEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
      keepalive: true,
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) return "failed";
    const payload = (await response.json()) as { ok?: unknown; emailed?: unknown };
    return payload.ok === true && payload.emailed === true ? "sent" : "failed";
  } catch {
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

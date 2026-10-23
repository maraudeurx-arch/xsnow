/**
 * Arbiter invitation and wallet reminder emails (Popol, 22/10/2026), sent on the owner's request only
 * (POST /arbitrage/admin/arbiter-mail). Signed « La direction d'OPC ». Short, simple steps.
 * No pay figures, no percentages, no authority words, no person name.
 */
import { OPC_DIRECTION_EMAIL } from "../../../src/lib/arb-checklist.ts";
import { RESEND_API_URL, resolveFromAddress } from "../../../src/lib/owner-mail.ts";
import { MANUEL_JUSTICE_PAGE_URL } from "../../../src/lib/arbitrage.ts";
import { redactForLog, type MailLang } from "./decision-mail.ts";

export type ArbiterMailKind = "invite" | "wallet";
export const ARBITRAGE_PAGE_URL = "https://opencommunity.app/arbitrage/";

const L = {
  fr: {
    invite: {
      subj: "Bienvenue parmi les arbitres OPC : ton premier dossier test t’attend",
      body: [
        "Bonjour,",
        "",
        "Ta place d’arbitre OPC est prête. Voici comment commencer, pas à pas :",
        "1. Ouvre OPC et va sur la page Arbitrage (lien ci-dessous).",
        "2. Regarde ta liste d’accueil : elle te montre ce qui est fait et ce qui reste à faire.",
        "3. Réponds au dossier test (une SIMULATION : aucun vrai litige, aucun paiement).",
        "4. Lis le Manuel de justice, puis touche « J’ai lu le Manuel ».",
        "5. Active les notifications pour savoir quand un dossier t’attend.",
        "",
        "Après chaque décision, Indiana t’explique simplement pourquoi, avec un extrait du Manuel.",
      ],
    },
    wallet: {
      subj: "Petit rappel : connecte ton wallet dans OPC",
      body: [
        "Bonjour,",
        "",
        "Il ne te manque qu’une étape : connecter ton wallet. Aucun paiement n’est fait à cette étape.",
        "1. Ouvre OPC et va sur la page Arbitrage (lien ci-dessous).",
        "2. Dans ta liste d’accueil, touche « Connect ».",
        "3. Choisis ton wallet, ou crée-en un (c’est gratuit), puis accepte la connexion.",
        "Pas besoin de changer de réseau.",
      ],
    },
    page: "Page Arbitrage :", manual: "Manuel de justice :", contact: "Une question, une suggestion ? Écris-nous :", sign: "La direction d’OPC",
  },
  en: {
    invite: {
      subj: "Welcome among OPC arbiters: your first test case is waiting",
      body: [
        "Hello,",
        "",
        "Your OPC arbiter space is ready. Here is how to start, step by step:",
        "1. Open OPC and go to the Arbitration page (link below).",
        "2. Look at your welcome checklist: it shows what is done and what is left.",
        "3. Answer the test case (a SIMULATION: no real dispute, no payment).",
        "4. Read the Justice Manual, then tap “I read the Manual”.",
        "5. Turn on notifications to know when a case is waiting.",
        "",
        "After each decision, Indiana explains simply why, with an excerpt from the Manual (in French).",
      ],
    },
    wallet: {
      subj: "Quick reminder: connect your wallet in OPC",
      body: [
        "Hello,",
        "",
        "Only one step is left: connecting your wallet. No payment is made at this step.",
        "1. Open OPC and go to the Arbitration page (link below).",
        "2. In your welcome checklist, tap “Connect”.",
        "3. Pick your wallet, or create one (it is free), then accept the connection.",
        "No need to switch networks.",
      ],
    },
    page: "Arbitration page:", manual: "Justice Manual:", contact: "A question, a suggestion? Write to us:", sign: "OPC management",
  },
  es: {
    invite: {
      subj: "Bienvenido entre los árbitros de OPC: tu primer caso de prueba te espera",
      body: [
        "Hola:",
        "",
        "Tu espacio de árbitro OPC está listo. Así empiezas, paso a paso:",
        "1. Abre OPC y ve a la página Arbitraje (enlace abajo).",
        "2. Mira tu lista de bienvenida: muestra lo que está hecho y lo que falta.",
        "3. Responde el caso de prueba (una SIMULACIÓN: ninguna disputa real, ningún pago).",
        "4. Lee el Manual de justicia y toca « Leí el Manual ».",
        "5. Activa las notificaciones para saber cuándo te espera un caso.",
        "",
        "Después de cada decisión, Indiana te explica de forma sencilla por qué, con un extracto del Manual (en francés).",
      ],
    },
    wallet: {
      subj: "Pequeño recordatorio: conecta tu wallet en OPC",
      body: [
        "Hola:",
        "",
        "Solo te falta un paso: conectar tu wallet. En este paso no se hace ningún pago.",
        "1. Abre OPC y ve a la página Arbitraje (enlace abajo).",
        "2. En tu lista de bienvenida, toca « Connect ».",
        "3. Elige tu wallet, o crea una (es gratis), y acepta la conexión.",
        "No hace falta cambiar de red.",
      ],
    },
    page: "Página Arbitraje:", manual: "Manual de justicia:", contact: "¿Una pregunta, una sugerencia? Escríbenos:", sign: "La dirección de OPC",
  },
} as const;

export function parseArbiterMailKind(raw: unknown): ArbiterMailKind | null {
  return raw === "invite" || raw === "wallet" ? raw : null;
}

export function arbiterMail(kind: ArbiterMailKind, lang: MailLang): { subject: string; text: string } {
  const t = L[lang];
  const k = t[kind];
  const lines: string[] = [...k.body, "", `${t.page} ${ARBITRAGE_PAGE_URL}`];
  if (kind === "invite") lines.push(`${t.manual} ${MANUEL_JUSTICE_PAGE_URL}`);
  lines.push("", `${t.contact} ${OPC_DIRECTION_EMAIL}`, "", t.sign);
  return { subject: k.subj, text: lines.join("\n") };
}

export type ArbiterMailEnv = { RESEND_API_KEY?: string; IDEAS_FROM_EMAIL?: string };

/** Returns "off" | "no_email" | "sent" | "failed". Never throws. One redacted log line. */
export async function sendArbiterMail(env: ArbiterMailEnv, to: string | null, lang: MailLang, kind: ArbiterMailKind, arbiterId: string,
  fetchImpl: typeof fetch, log: (line: string) => void = (l) => console.log(l)): Promise<string> {
  const tag = `arbiter-mail kind=${kind} arbiter=${arbiterId}`;
  if (!env.RESEND_API_KEY) { log(`${tag} result=off reason=no_resend_key`); return "off"; }
  if (!to) { log(`${tag} result=no_email`); return "no_email"; }
  const m = arbiterMail(kind, lang);
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

/**
 * Login code for an existing arbiter (Popol, 22/10/2026): the iPhone home-screen app keeps its own
 * storage, so the arbiter types a 6-digit code received by email to find their profile again.
 * Signed « La direction d'OPC ». No pay figures, no authority words.
 */
import { RESEND_API_URL, resolveFromAddress } from "../../../src/lib/owner-mail.ts";
import { redactForLog, type MailLang } from "./decision-mail.ts";

export const LOGIN_CODE_TTL_MS = 15 * 60 * 1000;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
export const LOGIN_CODES_PER_HOUR = 3;
export const ARBITRAGE_PAGE_URL = "https://opencommunity.app/arbitrage/";

const L = {
  fr: {
    subj: "Ton code pour retrouver ton profil d’arbitre OPC",
    hello: "Bonjour,",
    code: "Ton code :",
    how: "Ouvre OPC (l’app sur ton écran d’accueil ou le site), va sur la page Arbitrage, touche « Retrouver mon profil d’arbitre », puis tape ce code.",
    ttl: "Le code marche 15 minutes, une seule fois.",
    notYou: "Tu n’as rien demandé ? Ignore ce courriel : personne ne peut entrer sans ce code.",
    sign: "La direction d’OPC",
  },
  en: {
    subj: "Your code to find your OPC arbiter profile",
    hello: "Hello,",
    code: "Your code:",
    how: "Open OPC (the app on your home screen or the website), go to the Arbitration page, tap “Find my arbiter profile”, then type this code.",
    ttl: "The code works for 15 minutes, only once.",
    notYou: "Didn’t ask for this? Ignore this email: nobody can get in without this code.",
    sign: "OPC management",
  },
  es: {
    subj: "Tu código para recuperar tu perfil de árbitro OPC",
    hello: "Hola:",
    code: "Tu código:",
    how: "Abre OPC (la app en tu pantalla de inicio o el sitio), ve a la página Arbitraje, toca « Recuperar mi perfil de árbitro » y escribe este código.",
    ttl: "El código funciona 15 minutos, una sola vez.",
    notYou: "¿No lo pediste? Ignora este correo: nadie puede entrar sin este código.",
    sign: "La dirección de OPC",
  },
} as const;

export function loginMail(code: string, lang: MailLang): { subject: string; text: string } {
  const t = L[lang];
  return {
    subject: t.subj,
    text: [t.hello, "", `${t.code} ${code}`, "", t.how, ARBITRAGE_PAGE_URL, "", t.ttl, t.notYou, "", t.sign].join("\n"),
  };
}

/** 6 digits, uniform (rejection sampling). */
export function newLoginCode(): string {
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < 4_294_000_000) return String(buf[0] % 1_000_000).padStart(6, "0");
  }
}

export function parseLoginCode(raw: unknown): string {
  const s = typeof raw === "string" ? raw.replace(/\s+/g, "") : "";
  return /^\d{6}$/.test(s) ? s : "";
}

export type LoginMailEnv = { RESEND_API_KEY?: string; IDEAS_FROM_EMAIL?: string };

/** Returns "off" | "sent" | "failed". Never throws. One redacted log line (no address, no code). */
export async function sendLoginCode(env: LoginMailEnv, to: string, lang: MailLang, code: string, fetchImpl: typeof fetch,
  log: (line: string) => void = (l) => console.log(l)): Promise<string> {
  if (!env.RESEND_API_KEY) { log("arb-login-code result=off reason=no_resend_key"); return "off"; }
  const m = loginMail(code, lang);
  try {
    const r = await fetchImpl(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: resolveFromAddress(env.IDEAS_FROM_EMAIL), to: [to], subject: m.subject, text: m.text }),
    });
    const body = redactForLog((await r.text().catch(() => "")).replace(/\b\d{6}\b/g, "[code]"));
    log(`arb-login-code result=${r.ok ? "sent" : "failed"} resend_status=${r.status} body=${body}`);
    return r.ok ? "sent" : "failed";
  } catch (e) {
    log(`arb-login-code result=failed resend_status=0 error=${redactForLog(String(e))}`);
    return "failed";
  }
}

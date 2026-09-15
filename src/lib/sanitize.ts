/**
 * Visitor-authored strings are untrusted forever.
 * Output is plain text only — never HTML, never a URL scheme that can execute.
 */

export const SUGGESTION_TEXT_MAX = 280;
export const SHARE_TEXT_MAX = 2500;
export const CHAT_TEXT_MAX = 4_000;
export const NOTES_TEXT_MAX = 800;
export const TITLE_TEXT_MAX = 80;
export const CONTACT_TEXT_MAX = 80;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const COORDS_RE = /-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+/;
const DATA_URL_RE = /data\s*:\s*[^\s,;]+(?:\s*;\s*[^,\s]+)*\s*,\s*[^\s]*/gi;
const EXEC_SCHEME_RE = /(?:javascript|vbscript|livescript|mocha|blob)\s*:/gi;
const FILE_SCHEME_RE = /file\s*:/gi;
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const EVENT_HANDLER_RE = /\bon[a-z]+\s*=\s*(["']).*?\1/gi;
const EVENT_HANDLER_UNQUOTED_RE = /\bon[a-z]+\s*=\s*[^\s>]+/gi;
const DANGEROUS_BLOCK_RE =
  /<\s*(script|style|iframe|object|embed|link|meta|svg|math|form|base|textarea|noscript|template|xmp|foreignobject)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_VOID_RE =
  /<\s*(script|iframe|object|embed|link|meta|base|svg|form|textarea)\b[^>]*\/?\s*>/gi;
const PEM_RE = /-----BEGIN [A-Z0-9 ]+-----[\s\S]*?-----END [A-Z0-9 ]+-----/g;
const PDF_MARK_RE = /%PDF-[\d.]+/g;
const CONTROLS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;

export type SanitizeTextOptions = {
  max?: number;
  redactEmails?: boolean;
  allowNewlines?: boolean;
  /** Privacy: drop the whole string when it still looks like GPS. */
  dropCoordinates?: boolean;
};

export function looksLikeCoordinates(text: string) {
  return COORDS_RE.test(text);
}

export function isJsonContentType(header: string | null | undefined) {
  if (!header) return false;
  const [type] = header.split(";");
  return type.trim().toLowerCase() === "application/json";
}

export function sanitizeRecordId(raw: unknown, max = 80) {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/[^A-Za-z0-9._-]/g, "").slice(0, max);
}

/**
 * Collapse a visitor string to inert plain text.
 * Does not decode HTML entities (that would re-create tags).
 */
export function sanitizeUntrustedText(input: unknown, options: SanitizeTextOptions = {}): string {
  if (typeof input !== "string") return "";
  const max = options.max ?? SUGGESTION_TEXT_MAX;
  let text = input.normalize("NFKC").replace(CONTROLS_RE, "");

  if (options.allowNewlines) {
    text = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n");
  } else {
    text = text.replace(/[\r\n\t]+/g, " ");
  }

  for (let pass = 0; pass < 5; pass += 1) {
    const next = text
      .replace(DANGEROUS_BLOCK_RE, " ")
      .replace(DANGEROUS_VOID_RE, " ")
      .replace(EVENT_HANDLER_RE, " ")
      .replace(EVENT_HANDLER_UNQUOTED_RE, " ")
      .replace(HTML_TAG_RE, " ");
    if (next === text) break;
    text = next;
  }

  text = text
    .replace(PEM_RE, "[removed-binary]")
    .replace(PDF_MARK_RE, "[removed-binary]")
    .replace(/[A-Za-z0-9+/]{80,}={0,2}/g, (blob) =>
      /[+/]/.test(blob) || /==$/.test(blob) ? "[removed-binary]" : blob,
    )
    .replace(DATA_URL_RE, "[removed-data]")
    .replace(EXEC_SCHEME_RE, "")
    .replace(FILE_SCHEME_RE, "");

  if (options.redactEmails) {
    text = text.replace(EMAIL_RE, "[redacted]");
  }

  if (options.allowNewlines) {
    text = text
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } else {
    text = text.replace(/\s+/g, " ").trim();
  }

  if (options.dropCoordinates && (!text || looksLikeCoordinates(text))) {
    return "";
  }

  return text.length > max ? text.slice(0, max) : text;
}

/** http(s) only. Empty string if the value is missing, relative, or a dangerous scheme. */
export function safeHttpUrl(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (url.username || url.password) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function hostnameOfHttpUrl(raw: unknown): string {
  const href = safeHttpUrl(raw);
  if (!href) return "";
  try {
    return new URL(href).hostname;
  } catch {
    return "";
  }
}

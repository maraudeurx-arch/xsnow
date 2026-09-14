export const PUTER_SCRIPT_SRC = "https://js.puter.com/v2/";
/** Documented default Puter chat model — lightweight / fast. */
export const PUTER_MODEL = "gpt-5-nano";
export const PUTER_MAX_TOKENS = 400;

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatFaultKind = "auth" | "network" | "empty";

export class ChatFault extends Error {
  readonly kind: ChatFaultKind;

  constructor(kind: ChatFaultKind) {
    super(kind);
    this.name = "ChatFault";
    this.kind = kind;
  }
}

function flattenContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
      return "";
    })
    .join("")
    .trim();
}

function assistantText(payload: unknown): string {
  if (typeof payload === "string") return payload.trim();
  if (!payload || typeof payload !== "object") return "";

  const record = payload as {
    message?: { content?: unknown };
    text?: unknown;
    toString?: () => string;
  };

  const fromMessage = flattenContent(record.message?.content);
  if (fromMessage) return fromMessage;

  if (typeof record.text === "string" && record.text.trim()) {
    return record.text.trim();
  }

  if (typeof record.toString === "function") {
    const printed = record.toString();
    if (printed && printed !== "[object Object]") return printed.trim();
  }

  return "";
}

function errorBlob(caught: unknown): string {
  if (caught instanceof Error) return `${caught.name} ${caught.message}`;
  if (typeof caught === "string") return caught;
  if (caught && typeof caught === "object") {
    const record = caught as { error?: unknown; code?: unknown; msg?: unknown; message?: unknown };
    return [record.error, record.code, record.msg, record.message].map(String).join(" ");
  }
  return "";
}

function isAbort(caught: unknown) {
  return caught instanceof DOMException && caught.name === "AbortError";
}

function isAuthError(caught: unknown) {
  const blob = errorBlob(caught).toLowerCase();
  return /popup_blocked|auth_window_closed|not_signed_in|sign[-_ ]?in|auth|login|permission|unauthorized|forbidden/.test(
    blob,
  );
}

async function waitForPuter(signal?: AbortSignal): Promise<NonNullable<Window["puter"]>> {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const puter = window.puter;
    if (puter?.ai?.chat && puter.auth) {
      return puter;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new ChatFault("network");
}

export async function completeChat(options: {
  system: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}): Promise<string> {
  const puter = await waitForPuter(options.signal);

  if (!puter.auth.isSignedIn()) {
    try {
      await puter.auth.signIn({ attempt_temp_user_creation: true });
    } catch (caught) {
      if (isAbort(caught)) throw caught;
      throw new ChatFault("auth");
    }
  }

  if (options.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  try {
    const payload = await puter.ai.chat(
      [{ role: "system", content: options.system }, ...options.messages],
      false,
      {
        model: PUTER_MODEL,
        max_tokens: PUTER_MAX_TOKENS,
        temperature: 0.6,
        normalize: true,
      },
    );
    const text = assistantText(payload);
    if (!text) throw new ChatFault("empty");
    return text;
  } catch (caught) {
    if (isAbort(caught) || caught instanceof ChatFault) throw caught;
    if (isAuthError(caught)) throw new ChatFault("auth");
    throw new ChatFault("network");
  }
}

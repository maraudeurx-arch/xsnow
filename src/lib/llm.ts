/**
 * Public Cloudflare Worker chat proxy. No Puter, no visitor login.
 * After `npx wrangler deploy` in workers/xsnow-chat, set
 * NEXT_PUBLIC_CHAT_API_URL (or fill CHAT_API_FALLBACK_URL).
 */
export const CHAT_API_FALLBACK_URL =
  "https://xsnow-chat.xsnowopc.workers.dev";

export const CHAT_API_URL =
  process.env.NEXT_PUBLIC_CHAT_API_URL ||
  process.env.NEXT_PUBLIC_CHAT_API ||
  CHAT_API_FALLBACK_URL;

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatFaultKind = "network" | "empty";

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

function replyFromPayload(payload: unknown): string {
  if (typeof payload === "string") return payload.trim();
  if (!payload || typeof payload !== "object") return "";

  const record = payload as {
    reply?: unknown;
    response?: unknown;
    message?: { content?: unknown };
    choices?: Array<{ message?: { content?: unknown }; text?: unknown }>;
  };

  if (typeof record.reply === "string" && record.reply.trim()) {
    return record.reply.trim();
  }

  if (typeof record.response === "string" && record.response.trim()) {
    return record.response.trim();
  }

  const choice = record.choices?.[0];
  const fromChoice = flattenContent(choice?.message?.content);
  if (fromChoice) return fromChoice;
  if (typeof choice?.text === "string" && choice.text.trim()) {
    return choice.text.trim();
  }

  return flattenContent(record.message?.content);
}

function isAbort(caught: unknown) {
  return caught instanceof DOMException && caught.name === "AbortError";
}

export async function completeChat(options: {
  system: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}): Promise<string> {
  if (options.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  let response: Response;
  try {
    response = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: options.system,
        messages: options.messages,
      }),
      signal: options.signal,
    });
  } catch (caught) {
    if (isAbort(caught)) throw caught;
    throw new ChatFault("network");
  }

  if (options.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  if (!response.ok) {
    throw new ChatFault("network");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (caught) {
    if (isAbort(caught)) throw caught;
    throw new ChatFault("empty");
  }

  const text = replyFromPayload(payload);
  if (!text) throw new ChatFault("empty");
  return text;
}

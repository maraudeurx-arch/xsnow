export const LLM_STORAGE_KEY = "xsnow.llm";

export const LLM_DEFAULTS = {
  baseUrl: "https://api.moonshot.ai/v1",
  /** Documented Kimi chat model; change in settings if your account uses kimi-k3. */
  model: "kimi-k2.5",
} as const;

export type LlmSettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export function normalizeLlmSettings(value: unknown): LlmSettings {
  const raw =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    apiKey: typeof raw.apiKey === "string" ? raw.apiKey.trim() : "",
    baseUrl:
      typeof raw.baseUrl === "string" && raw.baseUrl.trim()
        ? raw.baseUrl.trim().replace(/\/$/, "")
        : LLM_DEFAULTS.baseUrl,
    model:
      typeof raw.model === "string" && raw.model.trim()
        ? raw.model.trim()
        : LLM_DEFAULTS.model,
  };
}

function assistantText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") {
    return "";
  }
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  const content = message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string"
          ? (part as { text: string }).text
          : "",
      )
      .join("")
      .trim();
  }
  return "";
}

function apiErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const error = (payload as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === "string" && error.message.trim()) {
      return error.message.trim();
    }
  }
  if (status === 401 || status === 403) {
    return "Clé API refusée. Vérifie-la dans les réglages.";
  }
  return `Erreur API (${status}).`;
}

export async function completeChat(options: {
  settings: LlmSettings;
  system: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}): Promise<string> {
  const { settings, system, messages, signal } = options;
  const url = `${settings.baseUrl}/chat/completions`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.6,
        max_tokens: 700,
        messages: [{ role: "system", content: system }, ...messages],
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new Error("network");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(apiErrorMessage(payload, response.status));
  }

  const text = assistantText(payload);
  if (!text) {
    throw new Error("empty");
  }
  return text;
}

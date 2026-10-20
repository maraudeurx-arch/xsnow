/** Browser client for the Worker /arbitrage/* routes. The arbiter token stays on this device. */
import { CHAT_API_URL } from "./llm.ts";

export const ARBITER_TOKEN_KEY = "opc.arbiter.token.v1";

export function arbitrageUrl(path: string, base: string = CHAT_API_URL): string {
  return `${base.replace(/\/+$/, "")}/arbitrage/${path.replace(/^\/+/, "")}`;
}

export function readArbiterToken(): string {
  try {
    return localStorage.getItem(ARBITER_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function writeArbiterToken(token: string) {
  try {
    if (token) localStorage.setItem(ARBITER_TOKEN_KEY, token);
    else localStorage.removeItem(ARBITER_TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

export async function arbFetch<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {}) {
  const res = await fetch(arbitrageUrl(path), {
    method: init.method ?? "GET",
    headers: {
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { status: res.status, data };
}

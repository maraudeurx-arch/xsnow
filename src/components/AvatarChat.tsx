"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AVATAR_CHAT, AVATAR_SYSTEM_PROMPT } from "@/lib/content";
import {
  completeChat,
  LLM_DEFAULTS,
  type ChatMessage,
  type LlmSettings,
} from "@/lib/llm";
import { useLlmSettings } from "@/lib/useLlmSettings";
import type { Avatar } from "@/lib/avatars";

export function AvatarChat({ avatar }: { avatar: Avatar }) {
  const [settings, setSettings] = useLlmSettings();
  const [draft, setDraft] = useState<LlmSettings>(settings);
  const [openSettings, setOpenSettings] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const showSettings = openSettings || !settings.apiKey;

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSettings(draft);
    setOpenSettings(false);
    setError(null);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (!settings.apiKey) {
      setOpenSettings(true);
      setError(AVATAR_CHAT.missingKey);
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reply = await completeChat({
        settings,
        system: `${AVATAR_SYSTEM_PROMPT} Ton apparence : ${avatar.label}.`,
        messages: nextMessages,
        signal: controller.signal,
      });
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      const message = caught instanceof Error ? caught.message : "";
      setError(
        message === "network" || message === "empty"
          ? AVATAR_CHAT.networkError
          : message || AVATAR_CHAT.genericError,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="flex min-h-0 w-full flex-1 flex-col rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,26,0.92)_0%,rgba(8,8,10,0.92)_100%)] p-2 text-left shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
      aria-label={AVATAR_CHAT.title}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-1">
        <h2 className="text-[12px] font-extrabold tracking-wide text-snow">
          {AVATAR_CHAT.title}
        </h2>
        <button
          type="button"
          className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-ice/90 hover:border-gold/50 hover:text-gold"
          aria-expanded={showSettings}
          onClick={() => {
            setDraft(settings);
            setOpenSettings((next) => !next);
          }}
        >
          {AVATAR_CHAT.settings}
        </button>
      </div>

      {!settings.apiKey ? (
        <p className="mt-1.5 px-1 text-[11px] leading-relaxed text-ice/85">
          {AVATAR_CHAT.empty}
        </p>
      ) : null}

      {showSettings ? (
        <form className="mt-1.5 space-y-1.5 rounded-xl border border-white/10 bg-black/25 p-2" onSubmit={saveSettings}>
          <label className="block text-[10px] font-bold tracking-wide text-gold uppercase">
            {AVATAR_CHAT.apiKeyLabel}
            <input
              type="password"
              autoComplete="off"
              value={draft.apiKey}
              onChange={(event) =>
                setDraft((current) => ({ ...current, apiKey: event.target.value }))
              }
              className="mt-0.5 w-full rounded-lg border border-white/15 bg-night px-2 py-1.5 text-[12px] font-medium text-snow outline-none focus:border-gold/70"
            />
          </label>
          <p className="text-[10px] leading-snug text-ice/80">{AVATAR_CHAT.apiKeyHint}</p>
          <a
            href={AVATAR_CHAT.apiKeyHelpUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-[11px] font-semibold text-gold underline-offset-2 hover:underline"
          >
            {AVATAR_CHAT.apiKeyHelp}
          </a>
          <details className="text-[11px] text-ice/85">
            <summary className="cursor-pointer font-semibold text-snow/80">
              URL et modèle
            </summary>
            <label className="mt-1.5 block text-[10px] font-bold tracking-wide text-ice/80 uppercase">
              {AVATAR_CHAT.baseUrlLabel}
              <input
                type="url"
                value={draft.baseUrl}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, baseUrl: event.target.value }))
                }
                placeholder={LLM_DEFAULTS.baseUrl}
                className="mt-0.5 w-full rounded-lg border border-white/15 bg-night px-2 py-1.5 text-[11px] text-snow outline-none focus:border-violet/60"
              />
            </label>
            <label className="mt-1.5 block text-[10px] font-bold tracking-wide text-ice/80 uppercase">
              {AVATAR_CHAT.modelLabel}
              <input
                value={draft.model}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, model: event.target.value }))
                }
                placeholder={LLM_DEFAULTS.model}
                className="mt-0.5 w-full rounded-lg border border-white/15 bg-night px-2 py-1.5 text-[11px] text-snow outline-none focus:border-violet/60"
              />
            </label>
          </details>
          <button
            type="submit"
            className="rounded-full border border-cobalt/55 bg-cobalt px-3 py-1 text-[11px] font-extrabold text-snow"
          >
            {AVATAR_CHAT.save}
          </button>
        </form>
      ) : null}

      <div
        ref={listRef}
        className="mt-1.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto px-1 py-1"
      >
        {messages.map((message, index) => (
          <p
            key={`${message.role}-${index}`}
            className={`max-w-[92%] rounded-2xl px-2.5 py-1.5 text-[12px] leading-snug ${
              message.role === "user"
                ? "ml-auto bg-cobalt text-snow"
                : "mr-auto border border-white/10 bg-white/[0.06] text-snow/95"
            }`}
          >
            {message.content}
          </p>
        ))}
        {busy ? (
          <p className="mr-auto text-[11px] text-ice/70">…</p>
        ) : null}
        {error ? (
          <p className="text-[11px] leading-snug text-gold">{error}</p>
        ) : null}
      </div>

      <form
        className="mt-1 flex shrink-0 items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={AVATAR_CHAT.placeholder}
          aria-label={AVATAR_CHAT.placeholder}
          className="min-h-[40px] min-w-0 flex-1 rounded-full border border-white/15 bg-night px-3 text-[13px] text-snow outline-none focus:border-gold/70"
        />
        <button
          type="submit"
          className="tap inline-flex items-center justify-center rounded-full border border-cobalt/55 bg-cobalt px-3 text-[11px] font-extrabold text-snow disabled:opacity-50"
          disabled={busy}
        >
          {AVATAR_CHAT.send}
        </button>
      </form>
    </section>
  );
}

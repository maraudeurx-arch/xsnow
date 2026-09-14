"use client";

import { useEffect, useRef, useState } from "react";
import { AVATAR_CHAT, AVATAR_SYSTEM_PROMPT } from "@/lib/content";
import { ChatFault, completeChat, type ChatMessage } from "@/lib/llm";
import type { Avatar } from "@/lib/avatars";

function faultCopy(caught: unknown) {
  if (caught instanceof ChatFault) {
    if (caught.kind === "auth") return AVATAR_CHAT.authRequired;
    if (caught.kind === "network") return AVATAR_CHAT.networkError;
  }
  return AVATAR_CHAT.genericError;
}

export function AvatarChat({ avatar }: { avatar: Avatar }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

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
        system: `${AVATAR_SYSTEM_PROMPT} Ton apparence : ${avatar.label}.`,
        messages: nextMessages,
        signal: controller.signal,
      });
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(faultCopy(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="flex min-h-0 w-full flex-1 flex-col rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,26,0.92)_0%,rgba(8,8,10,0.92)_100%)] p-2 text-left shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
      aria-label={AVATAR_CHAT.title}
    >
      <div className="flex shrink-0 items-center px-1">
        <h2 className="text-[12px] font-extrabold tracking-wide text-snow">
          {AVATAR_CHAT.title}
        </h2>
      </div>

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

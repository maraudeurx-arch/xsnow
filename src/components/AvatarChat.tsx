"use client";

import { useEffect, useRef, useState } from "react";
import { AVATAR_CHAT, AVATAR_SYSTEM_PROMPT } from "@/lib/content";
import { ChatFault, completeChat, type ChatMessage } from "@/lib/llm";
import { useSpeech } from "@/lib/speech";
import { useDictation } from "@/lib/useDictation";
import type { Avatar } from "@/lib/avatars";

function faultCopy(caught: unknown) {
  if (caught instanceof ChatFault) {
    if (caught.kind === "auth") return AVATAR_CHAT.authRequired;
    if (caught.kind === "network") return AVATAR_CHAT.networkError;
  }
  return AVATAR_CHAT.genericError;
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
      {listening ? (
        <path d="M4.2 3.2h7.6v9.6H4.2z" />
      ) : (
        <path d="M8 1.6A2.4 2.4 0 0 0 5.6 4v3.2a2.4 2.4 0 1 0 4.8 0V4A2.4 2.4 0 0 0 8 1.6ZM3.6 7.2a.6.6 0 0 1 .6.6 3.8 3.8 0 0 0 7.6 0 .6.6 0 1 1 1.2 0 5 5 0 0 1-4.4 4.77V14h1.6a.6.6 0 1 1 0 1.2H5.8a.6.6 0 1 1 0-1.2h1.6v-1.43A5 5 0 0 1 3 7.8a.6.6 0 0 1 .6-.6Z" />
      )}
    </svg>
  );
}

export function AvatarChat({ avatar }: { avatar: Avatar }) {
  const { speak, stop: stopSpeech, prime } = useSpeech();
  const dictation = useDictation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const voiceOnRef = useRef(true);
  const savedInputRef = useRef("");

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy, dictation.listening]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;

    dictation.cancel();
    stopSpeech();
    prime();

    const nextMessages: ChatMessage[] = [...messagesRef.current, { role: "user", content: trimmed }];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    busyRef.current = true;
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
      const withReply: ChatMessage[] = [...nextMessages, { role: "assistant", content: reply }];
      messagesRef.current = withReply;
      setMessages(withReply);
      if (voiceOnRef.current) speak(reply);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(faultCopy(caught));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function onMic() {
    if (busyRef.current) return;
    setError(null);

    if (dictation.listening) {
      dictation.stop();
      return;
    }

    savedInputRef.current = input;
    stopSpeech();
    prime();
    setInput("");
    dictation.start({
      onPreview: (text) => setInput(text),
      onCommit: (text) => {
        if (text) {
          void sendText(text);
          return;
        }
        setInput(savedInputRef.current);
      },
      onError: (message) => {
        setError(message);
        setInput(savedInputRef.current);
      },
    });
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
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
            voiceOn
              ? "border-cobalt/55 bg-cobalt/80 text-snow"
              : "border-white/20 bg-white/[0.04] text-snow/80"
          }`}
          aria-pressed={voiceOn}
          aria-label={voiceOn ? AVATAR_CHAT.voiceOn : AVATAR_CHAT.voiceOff}
          onClick={() => {
            const next = !voiceOnRef.current;
            voiceOnRef.current = next;
            setVoiceOn(next);
            if (!next) stopSpeech();
          }}
        >
          {voiceOn ? AVATAR_CHAT.voiceOn : AVATAR_CHAT.voiceOff}
        </button>
      </div>

      <div
        ref={listRef}
        className="mt-1.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto px-1 py-1"
      >
        {messages.map((message, index) =>
          message.role === "user" ? (
            <p
              key={`${message.role}-${index}`}
              className="ml-auto max-w-[92%] rounded-2xl bg-cobalt px-2.5 py-1.5 text-[12px] leading-snug text-snow"
            >
              {message.content}
            </p>
          ) : (
            <button
              key={`${message.role}-${index}`}
              type="button"
              className="mr-auto max-w-[92%] rounded-2xl border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-left text-[12px] leading-snug text-snow/95"
              aria-label={AVATAR_CHAT.listenReply}
              onClick={() => speak(message.content)}
            >
              {message.content}
            </button>
          ),
        )}
        {busy ? (
          <p className="mr-auto text-[11px] text-ice/70">…</p>
        ) : null}
        {dictation.listening ? (
          <p className="text-[11px] leading-snug text-gold" aria-live="polite">
            {AVATAR_CHAT.micListening}
          </p>
        ) : null}
        {error ? (
          <p className="text-[11px] leading-snug text-gold">{error}</p>
        ) : null}
      </div>

      <form
        className="mt-1 flex shrink-0 items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (dictation.listening) dictation.stop();
          else void sendText(input);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={dictation.listening ? AVATAR_CHAT.micListening : AVATAR_CHAT.placeholder}
          aria-label={AVATAR_CHAT.placeholder}
          readOnly={dictation.listening}
          className="min-h-[44px] min-w-0 flex-1 rounded-full border border-white/15 bg-night px-3 text-[13px] text-snow outline-none focus:border-gold/70"
        />
        <button
          type="button"
          className={`tap inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-extrabold disabled:opacity-50 ${
            dictation.listening
              ? "mic-listen border-gold/70 bg-gold text-night"
              : "border-white/20 bg-white/[0.06] text-snow"
          }`}
          aria-label={dictation.listening ? AVATAR_CHAT.micListening : AVATAR_CHAT.mic}
          aria-pressed={dictation.listening}
          disabled={busy}
          onClick={onMic}
        >
          <MicIcon listening={dictation.listening} />
          <span>{dictation.listening ? AVATAR_CHAT.micListening : AVATAR_CHAT.mic}</span>
        </button>
        <button
          type="submit"
          className="tap inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-cobalt/55 bg-cobalt px-3 text-[11px] font-extrabold text-snow disabled:opacity-50"
          disabled={busy || dictation.listening}
        >
          {AVATAR_CHAT.send}
        </button>
      </form>
    </section>
  );
}

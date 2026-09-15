"use client";

import { useEffect, useRef, useState } from "react";
import { avatarSystemPromptFor } from "@/lib/content";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";
import { dictationLang } from "@/lib/voices";
import {
  classifyDictationError,
  dictationSupported,
  getSpeechRecognitionCtor,
  transcriptFromEvent,
  type BrowserSpeechRecognition,
  type DictationErrorKind,
} from "@/lib/dictation";
import { ChatFault, completeChat, type ChatMessage } from "@/lib/llm";
import type { Avatar } from "@/lib/avatars";
import { useSpeech } from "@/lib/speech";

export function AvatarChat({ avatar }: { avatar: Avatar }) {
  const { speak, prime, stop } = useSpeech();
  const { city, placeName, localeHint } = usePlace();
  const { locale, m } = useI18n();
  const chat = m.chat;
  const avatarLabel = m.guide.avatars[avatar.id];

  function faultCopy(caught: unknown) {
    if (caught instanceof ChatFault && caught.kind === "network") {
      return chat.networkError;
    }
    return chat.genericError;
  }

  function micCopy(kind: DictationErrorKind) {
    if (kind === "unsupported") return chat.micUnsupported;
    if (kind === "permission") return chat.micPermission;
    if (kind === "silent") return chat.micSilent;
    if (kind === "network") return chat.micNetwork;
    return chat.micError;
  }
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const busyRef = useRef(false);
  const listeningRef = useRef(false);
  const recogRef = useRef<BrowserSpeechRecognition | null>(null);
  const heardRef = useRef("");
  const sentFromMicRef = useRef(false);
  const retryFrFrRef = useRef(false);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      const recog = recogRef.current;
      recogRef.current = null;
      if (!recog) return;
      recog.onresult = null;
      recog.onerror = null;
      recog.onend = null;
      recog.onstart = null;
      try {
        recog.abort();
      } catch {
        // Already stopped.
      }
    };
  }, []);

  function forgetRecognition(recog?: BrowserSpeechRecognition | null) {
    const node = recog ?? recogRef.current;
    if (recogRef.current === node) recogRef.current = null;
    listeningRef.current = false;
    if (!node) return;
    node.onresult = null;
    node.onerror = null;
    node.onend = null;
    node.onstart = null;
    try {
      node.abort();
    } catch {
      // Already stopped.
    }
  }

  async function sendText(raw: string) {
    const text = raw.trim();
    if (!text || busyRef.current) return;

    busyRef.current = true;
    const nextMessages: ChatMessage[] = [
      ...messagesRef.current,
      { role: "user", content: text },
    ];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setInput("");
    heardRef.current = "";
    setBusy(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reply = await completeChat({
        system: avatarSystemPromptFor(city, placeName, locale, avatarLabel),
        messages: nextMessages,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const withReply: ChatMessage[] = [
        ...nextMessages,
        { role: "assistant", content: reply },
      ];
      messagesRef.current = withReply;
      setMessages(withReply);
      speak(reply, avatar.gender);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(faultCopy(caught));
    } finally {
      if (abortRef.current === controller) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  function beginDictation(lang: string) {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setListening(false);
      setError(chat.micUnsupported);
      return;
    }

    const recog = new Ctor();
    recogRef.current = recog;
    recog.lang = lang;
    recog.continuous = false;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    recog.onstart = () => {
      listeningRef.current = true;
      setListening(true);
    };

    recog.onresult = (event) => {
      const { text, finalText } = transcriptFromEvent(event);
      const heard = finalText || text;
      if (heard) {
        heardRef.current = heard;
        setInput(heard);
      }
      if (finalText && !sentFromMicRef.current && !busyRef.current) {
        sentFromMicRef.current = true;
        listeningRef.current = false;
        setListening(false);
        try {
          recog.stop();
        } catch {
          // onend still runs.
        }
        void sendText(finalText);
      }
    };

    recog.onerror = (event) => {
      if (event.error === "aborted") return;
      if (event.error === "language-not-supported" && !retryFrFrRef.current) {
        retryFrFrRef.current = true;
        return;
      }
      listeningRef.current = false;
      setListening(false);
      setError(micCopy(classifyDictationError(event.error)));
    };

    recog.onend = () => {
      if (recogRef.current !== recog) return;
      if (retryFrFrRef.current) {
        retryFrFrRef.current = false;
        beginDictation(
          locale === "fr" ? "fr-FR" : locale === "es" ? "es-MX" : "en-GB",
        );
        return;
      }
      recogRef.current = null;
      listeningRef.current = false;
      setListening(false);
      const heard = heardRef.current.trim();
      if (!sentFromMicRef.current && heard && !busyRef.current) {
        sentFromMicRef.current = true;
        void sendText(heard);
      }
    };

    try {
      recog.start();
    } catch {
      listeningRef.current = false;
      setListening(false);
      setError(chat.micError);
    }
  }

  function onMicTap() {
    prime();
    stop();
    setError(null);

    if (listeningRef.current) {
      const heard = heardRef.current.trim();
      try {
        recogRef.current?.stop();
      } catch {
        forgetRecognition();
        setListening(false);
      }
      if (heard && !sentFromMicRef.current) {
        sentFromMicRef.current = true;
        void sendText(heard);
      }
      return;
    }

    if (busyRef.current) return;
    if (!dictationSupported()) {
      setError(chat.micUnsupported);
      return;
    }

    heardRef.current = "";
    sentFromMicRef.current = false;
    retryFrFrRef.current = false;
    beginDictation(dictationLang(locale, localeHint));
  }

  return (
    <section
      className="flex min-h-0 w-full flex-1 flex-col rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,26,0.92)_0%,rgba(8,8,10,0.92)_100%)] p-2 text-left shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
      aria-label={chat.title}
    >
      <div className="flex shrink-0 items-center px-1">
        <h2 className="text-[12px] font-extrabold tracking-wide text-snow">
          {chat.title}
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
          <p className="text-[11px] leading-snug text-gold" role="status">
            {error}
          </p>
        ) : null}
      </div>

      <form
        className="mt-1 flex shrink-0 items-center gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          forgetRecognition();
          setListening(false);
          stop();
          prime();
          void sendText(input);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={chat.placeholder}
          aria-label={chat.placeholder}
          className="min-h-[44px] min-w-0 flex-1 rounded-full border border-white/15 bg-night px-3 text-[13px] text-snow outline-none focus:border-gold/70"
        />
        <button
          type="button"
          className={`tap inline-flex shrink-0 items-center justify-center gap-1 rounded-full border px-2 text-[10px] font-extrabold ${
            listening
              ? "mic-listen border-gold/70 bg-gold/15 text-gold"
              : "border-white/20 bg-white/[0.06] text-snow"
          } disabled:opacity-50`}
          aria-label={listening ? chat.listening : chat.speak}
          aria-pressed={listening}
          disabled={busy && !listening}
          onClick={onMicTap}
        >
          <MicIcon />
          {listening ? chat.listening : chat.speak}
        </button>
        <button
          type="submit"
          className="tap inline-flex shrink-0 items-center justify-center rounded-full border border-cobalt/55 bg-cobalt px-2.5 text-[11px] font-extrabold text-snow disabled:opacity-50"
          disabled={busy}
        >
          {chat.send}
        </button>
      </form>
    </section>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
      <path d="M8 1.4A2.3 2.3 0 0 0 5.7 3.7v3.1a2.3 2.3 0 1 0 4.6 0V3.7A2.3 2.3 0 0 0 8 1.4Zm-4.4 5.4a.7.7 0 0 0-1.4 0 5.1 5.1 0 0 0 4.4 5v1.5H5.2a.7.7 0 0 0 0 1.4h5.6a.7.7 0 1 0 0-1.4H8.7v-1.5a5.1 5.1 0 0 0 4.4-5 .7.7 0 0 0-1.4 0 3.7 3.7 0 1 1-7.4 0Z" />
    </svg>
  );
}

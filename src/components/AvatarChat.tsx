"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { looksLikeMonetizeSuggestion, noteMonetizeSuggestion } from "@/lib/analytics";
import { avatarSystemPromptFor } from "@/lib/content";
import { looksLikeCommunityIdea, writeIdeaDraft } from "@/lib/ideas";
import { CHAT_TEXT_MAX, sanitizeUntrustedText } from "@/lib/sanitize";
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
import { FeedbackRow } from "@/components/FeedbackRow";

export function AvatarChat({
  avatar,
  newsHeadlines = "",
}: {
  avatar: Avatar;
  newsHeadlines?: string;
}) {
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
  const [pendingIdea, setPendingIdea] = useState("");
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
    const text = sanitizeUntrustedText(raw, {
      max: CHAT_TEXT_MAX,
      redactEmails: false,
      allowNewlines: false,
    });
    if (!text || busyRef.current) return;
    noteMonetizeSuggestion(text);
    if (looksLikeCommunityIdea(text) || looksLikeMonetizeSuggestion(text)) {
      setPendingIdea(text);
    }

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
        system: avatarSystemPromptFor(
          city,
          placeName,
          locale,
          avatarLabel,
          newsHeadlines,
        ),
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
      id="avatar-chat"
      className="flex min-h-0 w-full shrink-0 flex-col gap-0.5 rounded-xl border border-gold/25 bg-[linear-gradient(180deg,rgba(18,20,26,0.78)_0%,rgba(8,8,10,0.86)_100%)] p-1 pt-0.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
      aria-label={chat.title}
    >
      <div className="flex shrink-0 items-center gap-2 px-1">
        <h2 className="text-[10px] font-extrabold tracking-wide text-snow">
          {chat.title}
        </h2>
        {messages.length === 0 && !busy ? (
          <Link
            href="/vos-idees/#form"
            className="ml-auto text-[9px] font-extrabold text-gold hover:underline"
          >
            {chat.ideaPrompt}
          </Link>
        ) : null}
      </div>

      {messages.length > 0 ? <FeedbackRow surface="accueil" compact /> : null}

      <div
        ref={listRef}
        className={`min-h-0 space-y-1 overflow-y-auto px-1 ${
          messages.length > 0 || busy || pendingIdea || error
            ? "flex-1 py-0.5 max-h-[min(22dvh,8.5rem)]"
            : "h-0 overflow-hidden p-0"
        }`}
      >
        {messages.map((message, index) => (
          <p
            key={`${message.role}-${index}`}
            className={`max-w-[92%] rounded-2xl px-2 py-1 text-[11px] leading-snug ${
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
        {pendingIdea ? (
          <Link
            href="/vos-idees/#form"
            className="inline-flex min-h-8 w-full items-center justify-center rounded-xl border border-gold/50 bg-gold/10 px-3 text-center text-[10px] font-extrabold text-gold"
            onClick={() => writeIdeaDraft(pendingIdea)}
          >
            {chat.ideaCapture}
          </Link>
        ) : null}
        {error ? (
          <p className="text-[11px] leading-snug text-gold" role="status">
            {error}
          </p>
        ) : null}
      </div>

      <form
        className="mt-0.5 flex shrink-0 items-center gap-1.5"
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
          id="avatar-chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={chat.placeholder}
          aria-label={chat.placeholder}
          maxLength={CHAT_TEXT_MAX}
          className="min-h-[var(--home-nav-h)] min-w-0 flex-1 rounded-full border border-white/15 bg-night px-2.5 text-[16px] text-snow outline-none placeholder:text-snow/55 focus:border-gold/70"
        />
        <button
          type="button"
          className={`tap-sm inline-flex size-[var(--home-nav-h)] shrink-0 items-center justify-center rounded-full border ${
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
        </button>
        <button
          type="submit"
          className="tap-sm inline-flex size-[var(--home-nav-h)] shrink-0 items-center justify-center rounded-full border border-cobalt/55 bg-cobalt text-snow disabled:opacity-50"
          aria-label={chat.send}
          disabled={busy}
        >
          <SendIcon />
        </button>
      </form>
    </section>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 fill-current">
      <path d="M8 1.4A2.3 2.3 0 0 0 5.7 3.7v3.1a2.3 2.3 0 1 0 4.6 0V3.7A2.3 2.3 0 0 0 8 1.4Zm-4.4 5.4a.7.7 0 0 0-1.4 0 5.1 5.1 0 0 0 4.4 5v1.5H5.2a.7.7 0 0 0 0 1.4h5.6a.7.7 0 1 0 0-1.4H8.7v-1.5a5.1 5.1 0 0 0 4.4-5 .7.7 0 0 0-1.4 0 3.7 3.7 0 1 1-7.4 0Z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 fill-current">
      <path d="M2.1 8.05 13.4 2.4c.55-.28 1.12.3.84.84L8.6 14.5a.7.7 0 0 1-1.3-.08L6.1 9.9 2.18 8.7a.7.7 0 0 1-.08-1.3Z" />
    </svg>
  );
}

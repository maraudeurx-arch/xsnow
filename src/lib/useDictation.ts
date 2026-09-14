"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DICTATION_LANGS,
  dictationErrorCopy,
  getSpeechRecognitionCtor,
  isSpeechRecognitionSupported,
  liveTranscript,
  type DictationLang,
} from "@/lib/dictate";
import { AVATAR_CHAT } from "@/lib/content";

type DictationHandlers = {
  onPreview: (text: string) => void;
  onCommit: (text: string) => void;
  onError?: (message: string) => void;
};

export function useDictation() {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const langRef = useRef<DictationLang>(DICTATION_LANGS[0]);
  const listeningRef = useRef(false);
  const committedRef = useRef("");
  const handlersRef = useRef<DictationHandlers | null>(null);
  const skipCommitRef = useRef(false);

  const rememberListening = (next: boolean) => {
    listeningRef.current = next;
    setListening(next);
  };

  const ensureRecognizer = useCallback(() => {
    if (recRef.current) return recRef.current;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const { preview, committed } = liveTranscript(event);
      if (committed) committedRef.current = committed;
      handlersRef.current?.onPreview(preview || committed);
    };

    rec.onerror = (event) => {
      const code = event.error;
      if (code === "aborted") {
        skipCommitRef.current = true;
        return;
      }
      if (code === "language-not-supported" && langRef.current === "fr-CA") {
        langRef.current = "fr-FR";
      }
      if (code === "no-speech" && committedRef.current.trim()) return;
      if (code !== "no-speech") skipCommitRef.current = true;
      handlersRef.current?.onError?.(dictationErrorCopy(code));
    };

    rec.onend = () => {
      const text = committedRef.current.trim();
      const skip = skipCommitRef.current;
      skipCommitRef.current = false;
      rememberListening(false);
      if (skip) return;
      handlersRef.current?.onCommit(text);
    };

    recRef.current = rec;
    return rec;
  }, []);

  const cancel = useCallback(() => {
    skipCommitRef.current = true;
    committedRef.current = "";
    rememberListening(false);
    try {
      recRef.current?.abort();
    } catch {
      // Safari throws if recognition is already idle.
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      rememberListening(false);
    }
  }, []);

  const start = useCallback(
    (handlers: DictationHandlers) => {
      if (!isSpeechRecognitionSupported()) {
        handlers.onError?.(AVATAR_CHAT.micUnsupported);
        return false;
      }
      if (listeningRef.current) {
        stop();
        return true;
      }

      const rec = ensureRecognizer();
      if (!rec) {
        handlers.onError?.(AVATAR_CHAT.micUnsupported);
        return false;
      }

      handlersRef.current = handlers;
      committedRef.current = "";
      skipCommitRef.current = false;
      rec.lang = langRef.current;

      try {
        rec.start();
        rememberListening(true);
        return true;
      } catch {
        handlers.onError?.(AVATAR_CHAT.micGeneric);
        rememberListening(false);
        return false;
      }
    },
    [ensureRecognizer, stop],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.hidden && listeningRef.current) cancel();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      cancel();
    };
  }, [cancel]);

  return { listening, start, stop, cancel };
}

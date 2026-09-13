"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BUBBLE_INTRO, WELCOME_SPEECH } from "@/lib/content";

type SpeechContextValue = {
  isSpeaking: boolean;
  lastText: string;
  speak: (text: string) => void;
  replay: () => void;
};

const SpeechContext = createContext<SpeechContextValue | null>(null);

function pickFrenchVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === "fr-ca") ??
    voices.find((voice) => voice.lang.toLowerCase() === "fr-fr") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("fr"))
  );
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastText, setLastText] = useState(BUBBLE_INTRO);
  const lastRef = useRef(WELCOME_SPEECH);
  const watchRef = useRef<number | null>(null);
  const genRef = useRef(0);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined") return;

    const gen = ++genRef.current;
    const alive = () => genRef.current === gen;
    lastRef.current = text;
    setLastText(text);

    const stopWatch = () => {
      if (watchRef.current != null) {
        window.clearInterval(watchRef.current);
        watchRef.current = null;
      }
    };

    const finish = () => {
      if (!alive()) return;
      setIsSpeaking(false);
      stopWatch();
    };

    const estimatedMs = Math.min(24000, Math.max(1800, text.length * 65));

    // Mouth starts with the tap so lips move even if the engine is late or silent.
    setIsSpeaking(true);
    stopWatch();
    const startedAt = Date.now();
    let sawEngine = false;
    watchRef.current = window.setInterval(() => {
      if (!alive()) {
        stopWatch();
        return;
      }
      const synth = window.speechSynthesis;
      const talking = Boolean(synth?.speaking || synth?.pending);
      if (talking) sawEngine = true;
      if (sawEngine && !talking) {
        finish();
        return;
      }
      if (!sawEngine && Date.now() - startedAt > estimatedMs) {
        finish();
      }
    }, 80);

    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "fr-FR";
    utter.rate = 1.02;
    utter.pitch = 1;
    const voice = pickFrenchVoice();
    if (voice) utter.voice = voice;

    utter.onstart = () => {
      if (alive()) setIsSpeaking(true);
    };
    utter.onend = finish;
    // Chrome/Safari fire onerror after cancel(); ignore so the new line keeps talking.

    // Must stay in the user-gesture stack for iOS Safari.
    window.speechSynthesis.speak(utter);
    window.speechSynthesis.resume();
  }, []);

  const replay = useCallback(() => {
    speak(WELCOME_SPEECH);
  }, [speak]);

  useEffect(() => {
    return () => {
      if (watchRef.current != null) {
        window.clearInterval(watchRef.current);
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const value = useMemo(
    () => ({ isSpeaking, lastText, speak, replay }),
    [isSpeaking, lastText, speak, replay],
  );

  return (
    <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
  );
}

export function useSpeech() {
  const ctx = useContext(SpeechContext);
  if (!ctx) {
    throw new Error("useSpeech must be used within SpeechProvider");
  }
  return ctx;
}

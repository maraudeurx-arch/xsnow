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

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    lastRef.current = text;
    setLastText(text);

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "fr-FR";
    utter.rate = 1.02;
    utter.pitch = 1;
    const voice = pickFrenchVoice();
    if (voice) utter.voice = voice;

    const stopWatch = () => {
      if (watchRef.current != null) {
        window.clearInterval(watchRef.current);
        watchRef.current = null;
      }
    };

    const syncTalking = () => {
      const talking =
        window.speechSynthesis.speaking || window.speechSynthesis.pending;
      setIsSpeaking(talking);
      if (!talking) stopWatch();
    };

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => {
      setIsSpeaking(false);
      stopWatch();
    };
    utter.onerror = () => {
      setIsSpeaking(false);
      stopWatch();
    };

    // Start the mouth immediately; Safari often skips onstart.
    setIsSpeaking(true);
    // Must stay in the user-gesture stack for iOS Safari.
    window.speechSynthesis.speak(utter);
    window.speechSynthesis.resume();
    stopWatch();
    watchRef.current = window.setInterval(syncTalking, 80);
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

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { WELCOME_SPEECH } from "@/lib/content";

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
  const [lastText, setLastText] = useState(WELCOME_SPEECH);
  const lastRef = useRef(WELCOME_SPEECH);

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

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    // Must stay in the user-gesture stack for iOS Safari.
    window.speechSynthesis.speak(utter);
    window.speechSynthesis.resume();
  }, []);

  const replay = useCallback(() => {
    speak(lastRef.current);
  }, [speak]);

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

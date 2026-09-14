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

const FEMALE_HINT =
  /female|femme|woman|sylvie|am[eé]lie|audrey|marie|julie|claire|denise|hortense|aria|flo|l[eé]a|caroline|virginie|celeste|c[eé]leste/;
const MALE_HINT =
  /male|homme|man|thomas|nicolas|henri|paul|daniel|jean|jacques|pierre|guillaume|bernard|fr[eé]d[eé]ric|google fran[cç]ais|microsoft paul|microsoft henri|microsoft horatio|fred\b/;

function isFrench(voice: SpeechSynthesisVoice) {
  return voice.lang.toLowerCase().startsWith("fr");
}

function isMaleVoice(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase();
  if (FEMALE_HINT.test(name)) return false;
  if (MALE_HINT.test(name)) return true;
  const gender = (voice as SpeechSynthesisVoice & { gender?: string }).gender;
  return gender?.toLowerCase() === "male";
}

function pickFrenchMaleVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const french = voices.filter(isFrench);
  return (
    french.find((voice) => isMaleVoice(voice) && voice.lang.toLowerCase() === "fr-ca") ??
    french.find((voice) => isMaleVoice(voice) && voice.lang.toLowerCase() === "fr-fr") ??
    french.find(isMaleVoice) ??
    french.find((voice) => voice.lang.toLowerCase() === "fr-fr") ??
    french[0]
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
    utter.rate = 1.0;
    utter.pitch = 0.92;
    const voice = pickFrenchMaleVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang || "fr-FR";
    }

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
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }
    const warmVoices = () => {
      window.speechSynthesis.getVoices();
    };
    warmVoices();
    window.speechSynthesis.addEventListener("voiceschanged", warmVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", warmVoices);
      if (watchRef.current != null) {
        window.clearInterval(watchRef.current);
      }
      window.speechSynthesis.cancel();
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

const REPLAY_SELECTOR = "[data-welcome-replay]";
const ACCUEIL_SELECTOR = "[data-accueil]";

/** Survives React Strict Mode remounts so we only autoplay once per page load. */
let welcomeAutoplayStarted = false;

function engineBusy() {
  const synth = window.speechSynthesis;
  return Boolean(synth?.speaking || synth?.pending);
}

/**
 * Start the propositions presentation as soon as voices are ready.
 * iOS Safari often blocks speech without a gesture: still try on load,
 * then unlock on the first tap on the page. Accueil stays silent (it never
 * calls speak, and a tap on the menu does not consume the unlock).
 * Réécouter is skipped so it can replay without a double start.
 */
export function useWelcomeAutoplay() {
  const { replay } = useSpeech();

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    let cancelled = false;
    let confirmTimer: number | null = null;
    let voicesTimer: number | null = null;
    const synth = window.speechSynthesis;

    const detachGestures = () => {
      document.removeEventListener("pointerdown", onFirstGesture, true);
      document.removeEventListener("click", onFirstGesture, true);
    };

    function onFirstGesture(event: Event) {
      if (cancelled) return;
      const target = event.target;
      if (target instanceof Element && target.closest(REPLAY_SELECTOR)) {
        welcomeAutoplayStarted = true;
        detachGestures();
        return;
      }
      if (target instanceof Element && target.closest(ACCUEIL_SELECTOR)) {
        return;
      }
      if (engineBusy()) {
        welcomeAutoplayStarted = true;
        detachGestures();
        return;
      }
      welcomeAutoplayStarted = true;
      detachGestures();
      replay();
    }

    document.addEventListener("pointerdown", onFirstGesture, true);
    document.addEventListener("click", onFirstGesture, true);

    const tryAutoplay = () => {
      if (cancelled || welcomeAutoplayStarted) {
        if (engineBusy()) detachGestures();
        return;
      }
      welcomeAutoplayStarted = true;
      replay();
      confirmTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (engineBusy()) detachGestures();
      }, 280);
    };

    const onVoicesChanged = () => {
      if (synth.getVoices().length > 0) {
        tryAutoplay();
      }
    };

    if (synth.getVoices().length > 0) {
      tryAutoplay();
    } else {
      synth.addEventListener("voiceschanged", onVoicesChanged);
      voicesTimer = window.setTimeout(tryAutoplay, 400);
    }

    return () => {
      cancelled = true;
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      if (voicesTimer != null) window.clearTimeout(voicesTimer);
      if (confirmTimer != null) window.clearTimeout(confirmTimer);
      detachGestures();
    };
  }, [replay]);
}

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
import { avatarById, type VoiceGender } from "@/lib/avatars";
import { readStoredAvatar } from "@/lib/device-memory";
import { welcomeSpeechFor } from "@/lib/content";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";
import { pickSpokenVoice, pitchForGender, spokenVoiceLang } from "@/lib/voices";

export type SpeakOptions = {
  onEngineStart?: () => void;
  onSettled?: () => void;
};

type SpeechContextValue = {
  isSpeaking: boolean;
  lastText: string;
  speak: (text: string, gender?: VoiceGender, options?: SpeakOptions) => void;
  replay: (gender?: VoiceGender) => void;
  prime: () => void;
  stop: () => void;
};

const SpeechContext = createContext<SpeechContextValue | null>(null);

function genderFromStoredAvatar(): VoiceGender | null {
  const id = readStoredAvatar();
  return id ? avatarById(id).gender : null;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const { city, localeHint } = usePlace();
  const voiceLang = spokenVoiceLang(locale, localeHint);
  const welcome = welcomeSpeechFor(city, locale);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastText, setLastText] = useState(welcome);
  const lastRef = useRef(welcome);
  const genderRef = useRef<VoiceGender>(genderFromStoredAvatar() ?? "male");
  const watchRef = useRef<number | null>(null);
  const genRef = useRef(0);

  const stopWatch = useCallback(() => {
    if (watchRef.current != null) {
      window.clearInterval(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    genRef.current += 1;
    stopWatch();
    setIsSpeaking(false);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [stopWatch]);

  const prime = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    // Must run in the originating tap on iOS Safari so later replies can speak.
    window.speechSynthesis.resume();
    try {
      const unlock = new SpeechSynthesisUtterance(" ");
      unlock.volume = 0;
      unlock.rate = 10;
      unlock.lang = voiceLang;
      window.speechSynthesis.speak(unlock);
    } catch {
      // Speech engine missing or blocked — typed chat still works.
    }
  }, [voiceLang]);

  const settleRef = useRef<(() => void) | null>(null);

  const speak = useCallback((text: string, gender?: VoiceGender, options?: SpeakOptions) => {
    if (typeof window === "undefined") return;
    const trimmed = text.trim();
    if (!trimmed) {
      options?.onSettled?.();
      return;
    }

    const resolved = gender ?? genderRef.current ?? genderFromStoredAvatar() ?? "male";
    genderRef.current = resolved;

    const gen = ++genRef.current;
    const alive = () => genRef.current === gen;
    lastRef.current = trimmed;
    setLastText(trimmed);

    settleRef.current?.();
    settleRef.current = () => {
      options?.onSettled?.();
      settleRef.current = null;
    };

    const finish = () => {
      if (!alive()) return;
      setIsSpeaking(false);
      stopWatch();
      settleRef.current?.();
    };

    const estimatedMs = Math.min(60000, Math.max(1800, trimmed.length * 70));
    const animate = !prefersReducedMotion();

    // Mouth starts with the tap so lips move even if the engine is late or silent.
    // prefers-reduced-motion mutes that animation only — speech still plays.
    if (animate) setIsSpeaking(true);
    else setIsSpeaking(false);
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

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    const utter = new SpeechSynthesisUtterance(trimmed);
    const voice = pickSpokenVoice(
      window.speechSynthesis.getVoices(),
      resolved,
      locale,
      localeHint,
    );
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang || voiceLang;
    utter.rate = 1.0;
    utter.pitch = pitchForGender(resolved, voice);

    utter.onstart = () => {
      if (!alive()) return;
      options?.onEngineStart?.();
      if (animate) setIsSpeaking(true);
    };
    utter.onend = finish;
    // Chrome/Safari fire onerror after cancel(); ignore so the new line keeps talking.

    // Welcome / replay stay in the user-gesture stack for iOS Safari.
    try {
      window.speechSynthesis.speak(utter);
      window.speechSynthesis.resume();
    } catch {
      settleRef.current?.();
    }
  }, [locale, localeHint, stopWatch, voiceLang]);

  const replay = useCallback((gender?: VoiceGender) => {
    speak(welcomeSpeechFor(city, locale), gender ?? genderRef.current);
  }, [city, locale, speak]);

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
    () => ({
      isSpeaking,
      lastText,
      speak,
      replay,
      prime,
      stop,
    }),
    [isSpeaking, lastText, speak, replay, prime, stop],
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

export {
  hasPlayedWelcomeFor,
  markWelcomePlayed,
  readWelcomeSpokenCity,
} from "@/lib/device-memory";

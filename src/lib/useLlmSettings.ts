"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  LLM_STORAGE_KEY,
  normalizeLlmSettings,
  type LlmSettings,
} from "@/lib/llm";

const listeners = new Set<() => void>();
let cached: LlmSettings | undefined;

function emit() {
  listeners.forEach((listener) => listener());
}

function readSettings(): LlmSettings {
  if (typeof window === "undefined") {
    return normalizeLlmSettings(null);
  }
  try {
    const raw = window.localStorage.getItem(LLM_STORAGE_KEY);
    return normalizeLlmSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeLlmSettings(null);
  }
}

export function useLlmSettings() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => {
      listeners.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    if (!cached) {
      cached = readSettings();
    }
    return cached;
  }, []);

  const getServerSnapshot = useCallback(
    () => normalizeLlmSettings(null),
    [],
  );

  const settings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setSettings = useCallback((next: LlmSettings) => {
    const normalized = normalizeLlmSettings(next);
    cached = normalized;
    window.localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify(normalized));
    emit();
  }, []);

  return [settings, setSettings] as const;
}

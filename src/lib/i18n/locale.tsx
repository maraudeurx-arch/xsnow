"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_LOCALE,
  DICTIONARIES,
  LOCALES,
  browserLanguages,
  detectLocale,
  parseLangOverride,
  readStoredLocale,
  writeStoredLocale,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import { subscribeDurableStorage } from "@/lib/durable-storage";

const listeners = new Set<() => void>();
let storedCache: Locale | null | undefined;

function emit() {
  storedCache = undefined;
  listeners.forEach((listener) => listener());
}

function readStored(): Locale | null {
  if (storedCache === undefined) {
    storedCache = readStoredLocale();
  }
  return storedCache;
}

type LocaleValue = {
  locale: Locale;
  m: Messages;
  source: "query" | "stored" | "auto";
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleValue | null>(null);

const fallbackValue: LocaleValue = {
  locale: DEFAULT_LOCALE,
  m: DICTIONARIES[DEFAULT_LOCALE],
  source: "auto",
  setLocale: () => {},
};

function LocaleProviderInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryLocale = parseLangOverride(searchParams.toString());

  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    const stopDurable = subscribeDurableStorage(() => {
      storedCache = undefined;
      onStoreChange();
    });
    return () => {
      listeners.delete(onStoreChange);
      stopDurable();
    };
  }, []);

  const stored = useSyncExternalStore(subscribe, readStored, () => null);
  const auto = detectLocale(browserLanguages());
  const locale = queryLocale ?? stored ?? auto;
  const source: LocaleValue["source"] = queryLocale ? "query" : stored ? "stored" : "auto";

  const setLocale = useCallback(
    (next: Locale) => {
      writeStoredLocale(next);
      emit();
      if (!searchParams.get("lang")) return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("lang");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      m: DICTIONARIES[locale],
      source,
      setLocale,
    }),
    [locale, setLocale, source],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LocaleContext.Provider value={fallbackValue}>{children}</LocaleContext.Provider>}>
      <LocaleProviderInner>{children}</LocaleProviderInner>
    </Suspense>
  );
}

export function useI18n() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return ctx;
}

export { LOCALES };
export type { Locale, Messages };

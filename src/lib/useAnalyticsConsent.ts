"use client";

import { useCallback, useSyncExternalStore } from "react";
import { resetAnalyticsQueue } from "@/lib/analytics";
import {
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/consent";
import { subscribeDurableStorage } from "@/lib/durable-storage";

export function useAnalyticsConsent() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const stopLocal = subscribeAnalyticsConsent(onStoreChange);
    const stopDurable = subscribeDurableStorage(onStoreChange);
    return () => {
      stopLocal();
      stopDurable();
    };
  }, []);
  const consent = useSyncExternalStore(
    subscribe,
    readAnalyticsConsent,
    () => "unset" as const,
  );

  const setConsent = useCallback((next: Exclude<AnalyticsConsent, "unset">) => {
    writeAnalyticsConsent(next);
    if (next !== "granted") resetAnalyticsQueue();
  }, []);

  return { consent, granted: consent === "granted", setConsent };
}

export function useHasHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { resetAnalyticsQueue } from "@/lib/analytics";
import {
  readAnalyticsConsent,
  resetAnalyticsConsentCache,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/consent";
import { subscribeDurableStorage } from "@/lib/durable-storage";

function subscribeConsent(onStoreChange: () => void) {
  const stopConsent = subscribeAnalyticsConsent(onStoreChange);
  const stopDurable = subscribeDurableStorage(() => {
    resetAnalyticsConsentCache();
    onStoreChange();
  });
  return () => {
    stopConsent();
    stopDurable();
  };
}

export function useAnalyticsConsent() {
  const consent = useSyncExternalStore(
    subscribeConsent,
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

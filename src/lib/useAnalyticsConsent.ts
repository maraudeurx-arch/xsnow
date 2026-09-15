"use client";

import { useCallback, useSyncExternalStore } from "react";
import { resetAnalyticsQueue } from "@/lib/analytics";
import {
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/consent";

export function useAnalyticsConsent() {
  const consent = useSyncExternalStore(
    subscribeAnalyticsConsent,
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

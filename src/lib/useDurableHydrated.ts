"use client";

import { useSyncExternalStore } from "react";
import { isDurableHydrated, subscribeDurableHydrated } from "@/lib/durable-storage";

/** True after the first IndexedDB → local restore attempt (success or empty). */
export function useDurableHydrated() {
  return useSyncExternalStore(subscribeDurableHydrated, isDurableHydrated, () => false);
}

"use client";

import { useDurableHydrated } from "@/lib/useDurableHydrated";

/**
 * True after the first IndexedDB → local restore attempt (success or empty).
 * Accueil and Mes infos must wait before treating “no avatar / no profile” as a new visitor.
 */
export function useDeviceMemoryReady() {
  return useDurableHydrated();
}

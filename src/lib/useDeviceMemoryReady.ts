"use client";

import { useEffect } from "react";
import { bootDeviceMemory } from "@/lib/device-memory";
import { useDurableHydrated } from "@/lib/useDurableHydrated";

/**
 * True after the first IndexedDB → local restore attempt (success or empty).
 * Accueil and Mes infos must wait before treating “no avatar / no profile” as a new visitor.
 * Also kicks boot so a late mount still starts restore if DeviceMemoryBoot lagged.
 */
export function useDeviceMemoryReady() {
  useEffect(() => {
    void bootDeviceMemory();
  }, []);
  return useDurableHydrated();
}

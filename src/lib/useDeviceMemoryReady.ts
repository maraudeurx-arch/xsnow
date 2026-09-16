"use client";

import { useEffect, useSyncExternalStore } from "react";
import { bootDeviceMemory } from "@/lib/device-memory";
import { isDurableBootReady, subscribeDurableBoot } from "@/lib/durable-storage";

export function useDeviceMemoryReady() {
  useEffect(() => {
    void bootDeviceMemory();
  }, []);
  return useSyncExternalStore(subscribeDurableBoot, isDurableBootReady, () => false);
}

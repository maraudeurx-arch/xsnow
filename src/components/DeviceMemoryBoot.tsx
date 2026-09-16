"use client";

import { useEffect } from "react";
import {
  migrateDeviceMemory,
  restoreDeviceMemoryFromBackup,
} from "@/lib/device-memory";
import {
  emitDurableStorage,
  listenForAppResume,
  markDurableHydrated,
  requestPersistentStorage,
} from "@/lib/durable-storage";

const RETRY_MS = [50, 250, 1000];
const READY_FALLBACK_MS = 1200;

/** Boot + resume: migrate keys, restore from IndexedDB, re-read on iOS/Android PWA wake. */
export function DeviceMemoryBoot() {
  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    requestPersistentStorage();

    const hydrate = () => {
      if (cancelled) return;
      migrateDeviceMemory();
      emitDurableStorage();
      void restoreDeviceMemoryFromBackup()
        .catch(() => 0)
        .then(() => {
          if (cancelled) return;
          emitDurableStorage();
          markDurableHydrated();
        });
    };

    hydrate();
    for (const ms of RETRY_MS) {
      timers.push(window.setTimeout(hydrate, ms));
    }
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) markDurableHydrated();
      }, READY_FALLBACK_MS),
    );
    const stop = listenForAppResume(hydrate);
    return () => {
      cancelled = true;
      stop();
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);
  return null;
}

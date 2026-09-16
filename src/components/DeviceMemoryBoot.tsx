"use client";

import { useEffect } from "react";
import {
  migrateDeviceMemory,
  restoreDeviceMemoryFromBackup,
} from "@/lib/device-memory";
import { emitDurableStorage, listenForAppResume } from "@/lib/durable-storage";

/** Boot + resume: migrate keys, restore from IndexedDB, re-read on iOS/Android PWA wake. */
export function DeviceMemoryBoot() {
  useEffect(() => {
    migrateDeviceMemory();
    let cancelled = false;
    const hydrate = () => {
      migrateDeviceMemory();
      void restoreDeviceMemoryFromBackup().then((count) => {
        if (cancelled) return;
        if (count > 0) emitDurableStorage();
      });
      emitDurableStorage();
    };
    hydrate();
    const stop = listenForAppResume(hydrate);
    return () => {
      cancelled = true;
      stop();
    };
  }, []);
  return null;
}

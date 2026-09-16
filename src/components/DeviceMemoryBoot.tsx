"use client";

import { useEffect } from "react";
import { bootDeviceMemory, resumeDeviceMemory } from "@/lib/device-memory";
import {
  isDurableBootReady,
  listenForAppResume,
} from "@/lib/durable-storage";

function markDocument(ready: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.deviceMemory = ready ? "ready" : "pending";
}

if (typeof window !== "undefined") {
  markDocument(isDurableBootReady());
  void bootDeviceMemory().then(() => markDocument(true));
}

/** Boot + resume: migrate keys, restore from IndexedDB, re-read on iOS/Android PWA wake. */
export function DeviceMemoryBoot() {
  useEffect(() => {
    let cancelled = false;
    markDocument(isDurableBootReady());
    void bootDeviceMemory().then(() => {
      if (!cancelled) markDocument(true);
    });
    const stop = listenForAppResume(() => {
      void resumeDeviceMemory().then(() => {
        if (!cancelled) markDocument(true);
      });
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);
  return null;
}

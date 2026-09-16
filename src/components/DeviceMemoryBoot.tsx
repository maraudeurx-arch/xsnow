"use client";

import { useEffect } from "react";
import { migrateDeviceMemory } from "@/lib/device-memory";

/** One-shot key migration (session welcome-played → localStorage). */
export function DeviceMemoryBoot() {
  useEffect(() => {
    migrateDeviceMemory();
  }, []);
  return null;
}

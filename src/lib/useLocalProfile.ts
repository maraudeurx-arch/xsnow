"use client";

import { useCallback, useSyncExternalStore } from "react";
import { subscribeDurableStorage } from "@/lib/durable-storage";
import {
  readLocalProfile,
  subscribeLocalProfile,
  writeLocalProfile,
  type LocalProfile,
} from "@/lib/local-profile";

let cached: LocalProfile | null | undefined;

function snapshot() {
  if (cached === undefined) {
    cached = readLocalProfile();
  }
  return cached;
}

export function useLocalProfile() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const stopLocal = subscribeLocalProfile(() => {
      cached = undefined;
      onStoreChange();
    });
    const stopDurable = subscribeDurableStorage(() => {
      cached = undefined;
      onStoreChange();
    });
    return () => {
      stopLocal();
      stopDurable();
    };
  }, []);

  const getSnapshot = useCallback(() => snapshot(), []);
  const getServerSnapshot = useCallback(() => null, []);

  const profile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setProfile = useCallback((next: LocalProfile) => {
    cached = next;
    writeLocalProfile(next);
  }, []);

  return [profile, setProfile] as const;
}

/** Test helper — drop the in-memory cache between cases. */
export function resetLocalProfileCache() {
  cached = undefined;
}

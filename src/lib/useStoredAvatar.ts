"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type AvatarId } from "@/lib/avatars";
import { readStoredAvatar, writeStoredAvatar } from "@/lib/device-memory";
import { subscribeDurableStorage } from "@/lib/durable-storage";

const listeners = new Set<() => void>();
let cached: AvatarId | null | undefined;

function emit() {
  cached = undefined;
  listeners.forEach((listener) => listener());
}

function readAvatar(): AvatarId | null {
  return readStoredAvatar();
}

export function useStoredAvatar() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    const stopDurable = subscribeDurableStorage(() => {
      cached = undefined;
      onStoreChange();
    });
    return () => {
      listeners.delete(onStoreChange);
      stopDurable();
    };
  }, []);

  const getSnapshot = useCallback(() => {
    const fresh = readAvatar();
    if (cached !== fresh) cached = fresh;
    return cached ?? null;
  }, []);

  const getServerSnapshot = useCallback(() => null, []);

  const avatarId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setAvatarId = useCallback((id: AvatarId) => {
    cached = id;
    writeStoredAvatar(id);
    emit();
  }, []);

  return [avatarId, setAvatarId] as const;
}

export function resetStoredAvatarCache() {
  cached = undefined;
}

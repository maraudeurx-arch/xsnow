"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type AvatarId } from "@/lib/avatars";
import { readStoredAvatar, writeStoredAvatar } from "@/lib/device-memory";

const listeners = new Set<() => void>();
let cached: AvatarId | null | undefined;

function emit() {
  listeners.forEach((listener) => listener());
}

function readAvatar(): AvatarId | null {
  return readStoredAvatar();
}

export function useStoredAvatar() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => {
      listeners.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    if (cached === undefined) {
      cached = readAvatar();
    }
    return cached;
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

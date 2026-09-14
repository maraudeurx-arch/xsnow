"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  AVATAR_STORAGE_KEY,
  isAvatarId,
  type AvatarId,
} from "@/lib/avatars";

const listeners = new Set<() => void>();
let cached: AvatarId | null | undefined;

function emit() {
  listeners.forEach((listener) => listener());
}

function readAvatar(): AvatarId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isAvatarId(parsed) ? parsed : null;
  } catch {
    return null;
  }
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
    window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(id));
    emit();
  }, []);

  return [avatarId, setAvatarId] as const;
}

"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { readList, writeList } from "@/lib/storage";

const listeners = new Map<string, Set<() => void>>();
const snapshots = new Map<string, unknown>();

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

export function useStoredList<T>(key: string) {
  const empty = useRef<T[]>([]);

  const subscribe = useCallback((onStoreChange: () => void) => {
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    set.add(onStoreChange);
    return () => {
      set.delete(onStoreChange);
    };
  }, [key]);

  const getSnapshot = useCallback(() => {
    if (!snapshots.has(key)) {
      snapshots.set(key, readList<T>(key));
    }
    return snapshots.get(key) as T[];
  }, [key]);

  const getServerSnapshot = useCallback(() => empty.current, []);

  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setItems = useCallback((next: T[]) => {
    snapshots.set(key, next);
    writeList(key, next);
    emit(key);
  }, [key]);

  return [items, setItems] as const;
}

/**
 * Like useStoredList, but writes `seed` the first time the key is absent.
 * Do not use this for personal offers, ideas, or demo listings — new devices
 * must start empty. Approved community content belongs in the versioned catalog.
 */
export function useSeededList<T>(key: string, seed: T[]) {
  const empty = useRef<T[]>([]);
  const seedRef = useRef(seed);

  const subscribe = useCallback((onStoreChange: () => void) => {
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    set.add(onStoreChange);
    return () => {
      set.delete(onStoreChange);
    };
  }, [key]);

  const getSnapshot = useCallback(() => {
    if (!snapshots.has(key)) {
      const existed =
        typeof window !== "undefined" && window.localStorage.getItem(key) !== null;
      const stored = readList<T>(key);
      if (!existed) {
        snapshots.set(key, seedRef.current);
        writeList(key, seedRef.current);
      } else {
        snapshots.set(key, stored);
      }
    }
    return snapshots.get(key) as T[];
  }, [key]);

  const getServerSnapshot = useCallback(() => empty.current, []);

  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setItems = useCallback((next: T[]) => {
    snapshots.set(key, next);
    writeList(key, next);
    emit(key);
  }, [key]);

  return [items, setItems] as const;
}

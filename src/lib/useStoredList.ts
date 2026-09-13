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

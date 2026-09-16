"use client";

import { durableGet, durableSet } from "./durable-storage.ts";

export function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = durableGet(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeList<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  durableSet(key, JSON.stringify(value));
}

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

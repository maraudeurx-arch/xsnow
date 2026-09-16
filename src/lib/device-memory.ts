/**
 * Durable on-device memory (localStorage). Soft-launch privacy: nothing here
 * is a remote account. A fresh browser starts empty.
 *
 * Keys keep their existing names (`xsnow.*`). DEVICE_MEMORY_VERSION is stored
 * so a later rename can migrate without wiping visitor data.
 *
 * Welcome-played used to live in sessionStorage (`xsnow.welcomePlayed`), which
 * made returning visits replay the spoken welcome. It now lives in localStorage;
 * a one-shot copy from sessionStorage preserves the current tab.
 */

import { AVATAR_STORAGE_KEY, isAvatarId, type AvatarId } from "./avatars.ts";
import { ANALYTICS_CONSENT_KEY } from "./consent.ts";
import { IDEAS_KEY, parseStoredIdea, type CommunityIdea } from "./ideas.ts";
import { LANG_STORAGE_KEY } from "./i18n/locales.ts";
import { LOCAL_PROFILE_KEY, parseStoredProfile, type LocalProfile } from "./local-profile.ts";

/** Same strings as `location.ts` — do not import that module (Node tests + @/ aliases). */
const GEO_CONSENT_KEY = "xsnow.geoConsent";
const PLACE_STORAGE_KEY = "xsnow.place";

export const DEVICE_MEMORY_VERSION = 1;
export const DEVICE_MEMORY_VERSION_KEY = "xsnow.memoryVersion";
export const WELCOME_PLAYED_KEY = "xsnow.welcomePlayed";
export const WELCOME_CITY_KEY = "xsnow.welcomeSpokenCity";

/** Canonical on-device keys. Do not invent a second name for the same fact. */
export const DEVICE_KEYS = {
  version: DEVICE_MEMORY_VERSION_KEY,
  avatar: AVATAR_STORAGE_KEY,
  profile: LOCAL_PROFILE_KEY,
  ideas: IDEAS_KEY,
  lang: LANG_STORAGE_KEY,
  geoConsent: GEO_CONSENT_KEY,
  place: PLACE_STORAGE_KEY,
  analyticsConsent: ANALYTICS_CONSENT_KEY,
  welcomePlayed: WELCOME_PLAYED_KEY,
  welcomeSpokenCity: WELCOME_CITY_KEY,
} as const;

export type DeviceMemorySnapshot = {
  avatar: AvatarId | null;
  profile: LocalProfile | null;
  ideas: CommunityIdea[];
};

function storageOf(
  store?: Storage,
): Storage | undefined {
  if (store) return store;
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function sessionOf(store?: Storage): Storage | undefined {
  if (store) return store;
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function getItem(store: Storage | undefined, key: string): string | null {
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function setItem(store: Storage | undefined, key: string, value: string) {
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    // Private mode / quota
  }
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export function parseStoredAvatar(raw: unknown): AvatarId | null {
  if (isAvatarId(raw)) return raw;
  if (typeof raw !== "string") return null;
  const parsed = parseJson(raw);
  if (isAvatarId(parsed)) return parsed;
  return isAvatarId(raw) ? raw : null;
}

export function readStoredAvatar(
  store?: Storage,
): AvatarId | null {
  return parseStoredAvatar(parseJson(getItem(storageOf(store), DEVICE_KEYS.avatar)));
}

export function writeStoredAvatar(id: AvatarId, store?: Storage) {
  if (!isAvatarId(id)) return;
  setItem(storageOf(store), DEVICE_KEYS.avatar, JSON.stringify(id));
}

function parsePlayedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function readWelcomePlayedIds(store?: Storage): string[] {
  return parsePlayedIds(parseJson(getItem(storageOf(store), DEVICE_KEYS.welcomePlayed)));
}

export function writeWelcomePlayedIds(ids: string[], store?: Storage) {
  const unique = [...new Set(ids.filter((id) => typeof id === "string" && id))];
  setItem(storageOf(store), DEVICE_KEYS.welcomePlayed, JSON.stringify(unique));
}

export function hasPlayedWelcomeFor(
  avatarId: string,
  store?: Storage,
): boolean {
  return readWelcomePlayedIds(store).includes(avatarId);
}

function readSpokenCities(store?: Storage): Record<string, string> {
  const parsed = parseJson(getItem(storageOf(store), DEVICE_KEYS.welcomeSpokenCity));
  if (!parsed || typeof parsed !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) out[key] = value;
  }
  return out;
}

export function readWelcomeSpokenCity(avatarId: string, store?: Storage): string | null {
  return readSpokenCities(store)[avatarId] ?? null;
}

export function markWelcomePlayed(avatarId: string, city?: string, store?: Storage) {
  if (!avatarId) return;
  const next = new Set(readWelcomePlayedIds(store));
  next.add(avatarId);
  writeWelcomePlayedIds([...next], store);
  if (!city?.trim()) return;
  const cities = readSpokenCities(store);
  cities[avatarId] = city.trim();
  setItem(storageOf(store), DEVICE_KEYS.welcomeSpokenCity, JSON.stringify(cities));
}

export function readStoredIdeas(store?: Storage): CommunityIdea[] {
  const parsed = parseJson(getItem(storageOf(store), DEVICE_KEYS.ideas));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(parseStoredIdea)
    .filter((item): item is CommunityIdea => Boolean(item));
}

export function writeStoredIdeas(ideas: CommunityIdea[], store?: Storage) {
  setItem(storageOf(store), DEVICE_KEYS.ideas, JSON.stringify(ideas));
}

export function readStoredProfile(store?: Storage): LocalProfile | null {
  return parseStoredProfile(parseJson(getItem(storageOf(store), DEVICE_KEYS.profile)));
}

export function readDeviceMemory(store?: Storage): DeviceMemorySnapshot {
  return {
    avatar: readStoredAvatar(store),
    profile: readStoredProfile(store),
    ideas: readStoredIdeas(store),
  };
}

function stampVersion(store?: Storage) {
  const storage = storageOf(store);
  const current = getItem(storage, DEVICE_KEYS.version);
  if (current === String(DEVICE_MEMORY_VERSION)) return;
  setItem(storage, DEVICE_KEYS.version, String(DEVICE_MEMORY_VERSION));
}

/** Copy sessionStorage welcome-played into localStorage once (no overwrite). */
export function migrateWelcomePlayed(
  local?: Storage,
  session?: Storage,
) {
  const localStore = storageOf(local);
  const existing = readWelcomePlayedIds(localStore);
  if (existing.length) return existing;
  const sessionStore = sessionOf(session);
  const fromSession = parsePlayedIds(parseJson(getItem(sessionStore, DEVICE_KEYS.welcomePlayed)));
  if (!fromSession.length) return existing;
  writeWelcomePlayedIds(fromSession, localStore);
  const sessionCities = parseJson(getItem(sessionStore, DEVICE_KEYS.welcomeSpokenCity));
  if (sessionCities && typeof sessionCities === "object" && !getItem(localStore, DEVICE_KEYS.welcomeSpokenCity)) {
    setItem(localStore, DEVICE_KEYS.welcomeSpokenCity, JSON.stringify(sessionCities));
  }
  return fromSession;
}

/** Run once at boot. Safe to call repeatedly. Does not seed demo listings. */
export function migrateDeviceMemory(local?: Storage, session?: Storage) {
  stampVersion(local);
  migrateWelcomePlayed(local, session);
}

export function emptyDeviceMemory(): DeviceMemorySnapshot {
  return { avatar: null, profile: null, ideas: [] };
}

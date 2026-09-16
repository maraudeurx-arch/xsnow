/**
 * Durable on-device key/value store for avatar, profile, ideas, and the
 * other `xsnow.*` facts.
 *
 * Primary: localStorage (sync, same keys as today).
 * Backup: IndexedDB, because iOS standalone WebView (Add to Home Screen)
 * and some Android TWA/PWA launches can present an empty localStorage on
 * the first tick of a cold start, then recover — or, in older WKWebView,
 * drop localStorage while IndexedDB survives.
 *
 * Boot must finish restore before UI treats "missing" as "new visitor".
 * Until then, empty writes must not mirror over a richer backup.
 *
 * Never uses sessionStorage. Never deletes `xsnow.*` keys on boot.
 */

const IDB_NAME = "xsnow-device-memory";
const IDB_STORE = "kv";
export const DURABLE_IDB_NAME = IDB_NAME;
export const DURABLE_IDB_STORE = IDB_STORE;
const KEY_PREFIX = "xsnow.";
const BOOT_TIMEOUT_MS = 2_000;

type AsyncKv = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  keys(): Promise<string[]>;
};

const listeners = new Set<() => void>();
const bootListeners = new Set<() => void>();
const memory = new Map<string, string>();
const pendingMirrors = new Map<string, string>();

let testBackup: Map<string, string> | null = null;
let idbQueue: Promise<void> = Promise.resolve();
let dbPromise: Promise<IDBDatabase> | null = null;
let bootReady = false;
let mirroringEnabled = true;
let initialHydration: Promise<number> | null = null;
let hydrateChain: Promise<number> = Promise.resolve(0);

export function subscribeDurableStorage(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function emitDurableStorage() {
  listeners.forEach((listener) => listener());
}

export function subscribeDurableBoot(onChange: () => void) {
  bootListeners.add(onChange);
  return () => {
    bootListeners.delete(onChange);
  };
}

export function isDurableBootReady() {
  return bootReady;
}

function emitBootReady() {
  bootListeners.forEach((listener) => listener());
}

function markBootReady() {
  bootReady = true;
  emitDurableStorage();
  emitBootReady();
}

/** Test helper — swap IndexedDB for an in-memory map. */
export function setDurableBackupForTests(backup: Map<string, string> | null) {
  resetDurableStorageForTests();
  testBackup = backup;
}

/** Test helper — drop session caches between cases. */
export function resetDurableStorageForTests() {
  testBackup = null;
  memory.clear();
  pendingMirrors.clear();
  bootReady = false;
  mirroringEnabled = true;
  initialHydration = null;
  hydrateChain = Promise.resolve(0);
  idbQueue = Promise.resolve();
  dbPromise = null;
}

function localStore(store?: Storage): Storage | undefined {
  if (store) return store;
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isXsnowKey(key: string) {
  return key.startsWith(KEY_PREFIX);
}

export function isBlankDurableValue(value: string | null | undefined) {
  if (value == null) return true;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "null" || trimmed === "undefined";
}

export function durableGet(key: string, store?: Storage): string | null {
  const storage = localStore(store);
  let fromLs: string | null = null;
  if (storage) {
    try {
      fromLs = storage.getItem(key);
    } catch {
      fromLs = null;
    }
  }
  if (!isBlankDurableValue(fromLs) && fromLs != null) {
    if (!store) memory.set(key, fromLs);
    return fromLs;
  }
  if (store) return fromLs;
  if (fromLs === "[]") {
    const cached = memory.get(key);
    if (shouldRestoreFromBackup(fromLs, cached ?? null) && cached) return cached;
    return fromLs;
  }
  const cached = memory.get(key);
  if (cached != null) return cached;
  return fromLs;
}

export function durableSet(key: string, value: string, store?: Storage) {
  if (!store) memory.set(key, value);
  const storage = localStore(store);
  if (storage) {
    try {
      storage.setItem(key, value);
    } catch {
      // Private mode / quota — still try the backup.
    }
  }
  if (!mirroringEnabled) {
    pendingMirrors.set(key, value);
    return;
  }
  void mirrorToBackup(key, value);
}

function mirrorToBackup(key: string, value: string) {
  if (testBackup) {
    testBackup.set(key, value);
    return Promise.resolve();
  }
  if (typeof indexedDB === "undefined") return Promise.resolve();
  idbQueue = idbQueue
    .then(() => idbSet(key, value))
    .catch(() => {
      // Backup is best-effort.
    });
  return idbQueue;
}

async function flushPendingMirrors() {
  const entries = [...pendingMirrors.entries()];
  pendingMirrors.clear();
  for (const [key, value] of entries) {
    const backup = await backupGet(key);
    if (shouldRestoreFromBackup(value, backup)) continue;
    if (testBackup) {
      testBackup.set(key, value);
      continue;
    }
    await mirrorToBackup(key, value);
  }
}

function idbApi(): AsyncKv {
  return {
    async get(key) {
      const db = await openIdb();
      return new Promise((resolve, reject) => {
        const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key);
        req.onsuccess = () => {
          const value = req.result;
          resolve(typeof value === "string" ? value : null);
        };
        req.onerror = () => reject(req.error);
      });
    },
    async set(key, value) {
      const db = await openIdb();
      return new Promise((resolve, reject) => {
        const req = db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
    async keys() {
      const db = await openIdb();
      return new Promise((resolve, reject) => {
        const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).getAllKeys();
        req.onsuccess = () => {
          const raw = req.result ?? [];
          resolve(raw.filter((item): item is string => typeof item === "string"));
        };
        req.onerror = () => reject(req.error);
      });
    },
  };
}

function openIdb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function idbSet(key: string, value: string) {
  await idbApi().set(key, value);
}

async function idbGet(key: string): Promise<string | null> {
  try {
    return await idbApi().get(key);
  } catch {
    return null;
  }
}

async function backupGet(key: string): Promise<string | null> {
  if (testBackup) return testBackup.get(key) ?? null;
  if (typeof indexedDB === "undefined") return null;
  return idbGet(key);
}

async function backupKeys(): Promise<string[]> {
  if (testBackup) return [...testBackup.keys()];
  if (typeof indexedDB === "undefined") return [];
  try {
    return await idbApi().keys();
  } catch {
    return [];
  }
}

/** True when local is missing/blank and backup has a real value, or local is [] while backup has items. */
export function shouldRestoreFromBackup(local: string | null, backup: string | null) {
  if (!backup || isBlankDurableValue(backup)) return false;
  if (local == null || isBlankDurableValue(local)) return true;
  if (local === "[]") {
    try {
      const parsed = JSON.parse(backup) as unknown;
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }
  return false;
}

function rememberRestored(key: string, value: string, store?: Storage) {
  if (!store) memory.set(key, value);
  const storage = localStore(store);
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy backup → localStorage for any missing `xsnow.*` key.
 * Does not delete keys. Returns the number of keys restored.
 */
export async function hydrateDurableFromBackup(
  keys: readonly string[] = [],
  store?: Storage,
): Promise<number> {
  const known = new Set<string>([...keys, ...(await backupKeys())].filter(isXsnowKey));
  let restored = 0;
  for (const key of known) {
    const local = durableGet(key, store);
    const backup = await backupGet(key);
    if (!shouldRestoreFromBackup(local, backup) || backup == null) continue;
    rememberRestored(key, backup, store);
    restored += 1;
  }
  return restored;
}

async function requestPersistentStorage() {
  if (typeof navigator === "undefined") return;
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Best-effort — iOS may ignore this until the app is installed.
  }
}

async function finishInitialMirrors() {
  mirroringEnabled = true;
  await flushPendingMirrors();
}

async function doHydration(
  keys: readonly string[],
  store: Storage | undefined,
  initial: boolean,
): Promise<number> {
  if (initial) {
    mirroringEnabled = false;
    await requestPersistentStorage();
  }

  const work = hydrateDurableFromBackup(keys, store);
  let timedOut = false;
  await Promise.race([
    work.then(
      () => {},
      () => {},
    ),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve();
      }, BOOT_TIMEOUT_MS);
    }),
  ]);

  if (timedOut) {
    markBootReady();
    void work
      .catch(() => 0)
      .then(async (late) => {
        if (initial) await finishInitialMirrors();
        if (late > 0 || !bootReady) markBootReady();
        else emitDurableStorage();
      });
    return 0;
  }

  const count = await work.catch(() => 0);
  if (initial) await finishInitialMirrors();
  markBootReady();
  return count;
}

async function runHydration(
  keys: readonly string[],
  store: Storage | undefined,
  initial: boolean,
): Promise<number> {
  const next = hydrateChain.then(
    () => doHydration(keys, store, initial),
    () => doHydration(keys, store, initial),
  );
  hydrateChain = next.catch(() => 0);
  return next;
}

/** First load: restore from IndexedDB, then allow backup mirrors. Idempotent. */
export function ensureDurableHydration(keys: readonly string[], store?: Storage) {
  if (!initialHydration) {
    mirroringEnabled = false;
    initialHydration = runHydration(keys, store, true).catch(() => {
      return finishInitialMirrors()
        .catch(() => {})
        .then(() => {
          markBootReady();
          return 0;
        });
    });
  }
  return initialHydration;
}

/** pageshow / visible: copy backup → local again without blocking first paint. */
export function rerunDurableHydration(keys: readonly string[], store?: Storage) {
  return runHydration(keys, store, false).catch(() => 0);
}

/** Re-read storage after iOS/Android standalone resume (pageshow / visible / focus). */
export function listenForAppResume(onResume: () => void) {
  if (typeof window === "undefined") return () => {};
  const onPageShow = () => onResume();
  const onFocus = () => onResume();
  const onVisibility = () => {
    if (document.visibilityState === "visible") onResume();
  };
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

export function sameJson(a: unknown, b: unknown) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

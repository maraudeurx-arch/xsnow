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
 * Never uses sessionStorage. Never deletes `xsnow.*` keys on boot.
 */

const IDB_NAME = "xsnow-device-memory";
const IDB_STORE = "kv";

type AsyncKv = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
};

const listeners = new Set<() => void>();
let testBackup: Map<string, string> | null = null;
let idbQueue: Promise<void> = Promise.resolve();

export function subscribeDurableStorage(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function emitDurableStorage() {
  listeners.forEach((listener) => listener());
}

/** Test helper — swap IndexedDB for an in-memory map. */
export function setDurableBackupForTests(backup: Map<string, string> | null) {
  testBackup = backup;
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

export function durableGet(key: string, store?: Storage): string | null {
  const storage = localStore(store);
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function durableSet(key: string, value: string, store?: Storage) {
  const storage = localStore(store);
  if (storage) {
    try {
      storage.setItem(key, value);
    } catch {
      // Private mode / quota — still try the backup.
    }
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
  };
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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

/** True when local is missing/blank and backup has a real value, or local is [] while backup has items. */
export function shouldRestoreFromBackup(local: string | null, backup: string | null) {
  if (!backup) return false;
  if (local == null || local === "") return true;
  if (local === "null") return true;
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

/**
 * Copy backup → localStorage for any missing `xsnow.*` key.
 * Does not delete keys. Returns the number of keys restored.
 */
export async function hydrateDurableFromBackup(
  keys: readonly string[],
  store?: Storage,
): Promise<number> {
  let restored = 0;
  for (const key of keys) {
    const local = durableGet(key, store);
    const backup = await backupGet(key);
    if (!shouldRestoreFromBackup(local, backup) || backup == null) continue;
    const storage = localStore(store);
    if (!storage) continue;
    try {
      storage.setItem(key, backup);
      restored += 1;
    } catch {
      // Private mode
    }
  }
  return restored;
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

/**
 * Durable on-device key/value store for avatar, profile, ideas, settings,
 * and the other `xsnow.*` facts.
 *
 * Layers (best → fallback):
 * 1. In-memory map (sync; survives until the document is torn down)
 * 2. localStorage (sync, same `xsnow.*` keys as today)
 * 3. sessionStorage (sync; same-tab refresh when localStorage is empty)
 * 4. IndexedDB (async backup). iOS standalone WebView (Add to Home Screen)
 *    and some Android TWA/PWA launches can present an empty localStorage on
 *    the first tick of a cold start, then recover — or, in older WKWebView,
 *    drop localStorage while IndexedDB survives.
 *
 * Reads prefer a non-empty local/session value, then the memory/IDB copy.
 * Writes go to every layer. Empty/null values never overwrite a populated
 * IndexedDB backup (boot-time empty localStorage must not wipe the profile).
 *
 * Never deletes `xsnow.*` keys on boot.
 */

export const DURABLE_IDB_NAME = "xsnow-device-memory";
export const DURABLE_IDB_STORE = "kv";

const IDB_NAME = DURABLE_IDB_NAME;
const IDB_STORE = DURABLE_IDB_STORE;

const listeners = new Set<() => void>();
const hydrateListeners = new Set<() => void>();
const memory = new Map<string, string>();

let testBackup: Map<string, string> | null = null;
let idbQueue: Promise<void> = Promise.resolve();
let dbPromise: Promise<IDBDatabase> | null = null;
let hydrated = false;
/** While false, durableSet queues mirrors instead of writing IndexedDB (boot race). */
let mirroringEnabled = true;
const pendingMirrors = new Map<string, string>();
let initialHydration: Promise<number> | null = null;
const BOOT_TIMEOUT_MS = 2_000;

export function subscribeDurableStorage(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function emitDurableStorage() {
  listeners.forEach((listener) => listener());
}

export function subscribeDurableHydrated(onChange: () => void) {
  hydrateListeners.add(onChange);
  return () => {
    hydrateListeners.delete(onChange);
  };
}

/** Alias kept for PR #75 naming. */
export function subscribeDurableBoot(onChange: () => void) {
  return subscribeDurableHydrated(onChange);
}

export function isDurableHydrated() {
  return hydrated;
}

export function markDurableHydrated() {
  if (hydrated) return;
  hydrated = true;
  hydrateListeners.forEach((listener) => listener());
}

/** Test helper — swap IndexedDB for an in-memory map. */
export function setDurableBackupForTests(backup: Map<string, string> | null) {
  testBackup = backup;
}

/** Test helper — drop the in-memory cache / hydrated flag between cases. */
export function resetDurableMemoryForTests() {
  memory.clear();
  hydrated = false;
  mirroringEnabled = true;
  pendingMirrors.clear();
  initialHydration = null;
  idbQueue = Promise.resolve();
  dbPromise = null;
}

/** Alias kept for call sites that prefer the PR #75 naming. */
export function resetDurableStorageForTests() {
  resetDurableMemoryForTests();
  testBackup = null;
}

export function isDurableBootReady() {
  return hydrated;
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

function sessionStore(store?: Storage): Storage | undefined {
  if (store) return undefined;
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function readSlot(storage: Storage | undefined, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeSlot(storage: Storage | undefined, key: string, value: string) {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function isEmptyDurableValue(value: string | null | undefined) {
  if (value == null) return true;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "null" || trimmed === "undefined";
}

/** Alias kept for PR #75 naming. */
export function isBlankDurableValue(value: string | null | undefined) {
  return isEmptyDurableValue(value);
}

function isXsnowKey(key: string) {
  return key.startsWith("xsnow.");
}

/** True when local is missing/blank and backup has a real value, or local is [] while backup has items. */
export function shouldRestoreFromBackup(local: string | null, backup: string | null) {
  if (isEmptyDurableValue(backup) || backup == null) return false;
  if (isEmptyDurableValue(local)) return true;
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

export function durableGet(key: string, store?: Storage): string | null {
  const local = readSlot(localStore(store), key);
  if (store) return local;

  const cached = memory.get(key) ?? null;
  if (shouldRestoreFromBackup(local, cached)) return cached;

  if (!isEmptyDurableValue(local) && local != null) {
    memory.set(key, local);
    return local;
  }

  const session = readSlot(sessionStore(store), key);
  if (shouldRestoreFromBackup(local, session) && session != null) {
    memory.set(key, session);
    return session;
  }
  if (!isEmptyDurableValue(session) && session != null) {
    memory.set(key, session);
    return session;
  }

  return local ?? cached ?? session ?? null;
}

export function durableSet(key: string, value: string, store?: Storage) {
  if (!store) {
    if (isEmptyDurableValue(value)) memory.delete(key);
    else memory.set(key, value);
  }
  writeSlot(localStore(store), key, value);
  writeSlot(sessionStore(store), key, value);
  if (!mirroringEnabled) {
    pendingMirrors.set(key, value);
    return;
  }
  void mirrorToBackup(key, value);
}

function mirrorToBackup(key: string, value: string) {
  if (isEmptyDurableValue(value)) return Promise.resolve();
  if (testBackup) {
    const existing = testBackup.get(key) ?? null;
    if (!shouldRestoreFromBackup(value, existing)) testBackup.set(key, value);
    return Promise.resolve();
  }
  if (typeof indexedDB === "undefined") return Promise.resolve();
  idbQueue = idbQueue
    .then(async () => {
      const existing = await idbGet(key);
      if (shouldRestoreFromBackup(value, existing)) return;
      await idbSet(key, value);
    })
    .catch(() => {
      // Backup is best-effort.
    });
  return idbQueue;
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
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onblocked = () => {
      dbPromise = null;
      reject(req.error ?? new Error("IndexedDB blocked"));
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function idbSet(key: string, value: string) {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await openIdb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key);
      req.onsuccess = () => {
        const value = req.result;
        resolve(typeof value === "string" ? value : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbGetAll(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve();
          return;
        }
        if (typeof cursor.key === "string" && typeof cursor.value === "string") {
          out.set(cursor.key, cursor.value);
        }
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Backup is best-effort.
  }
  return out;
}

async function backupGet(key: string): Promise<string | null> {
  if (testBackup) return testBackup.get(key) ?? null;
  if (typeof indexedDB === "undefined") return null;
  return idbGet(key);
}

async function backupGetAll(): Promise<Map<string, string>> {
  if (testBackup) return new Map(testBackup);
  if (typeof indexedDB === "undefined") return new Map();
  return idbGetAll();
}

/**
 * Copy backup → memory/localStorage/session for any missing `xsnow.*` key.
 * Also backfills IndexedDB from local values that were never mirrored.
 * Does not delete keys. Returns the number of keys restored.
 */
export async function hydrateDurableFromBackup(
  keys: readonly string[] = [],
  store?: Storage,
): Promise<number> {
  const backupMap = await backupGetAll();
  const allKeys = new Set<string>(
    [...keys, ...backupMap.keys()].filter((key) => isXsnowKey(key)),
  );
  let restored = 0;
  for (const key of allKeys) {
    const local = readSlot(localStore(store), key);
    const backup = backupMap.get(key) ?? (await backupGet(key));
    if (shouldRestoreFromBackup(local, backup) && backup != null) {
      if (!store) memory.set(key, backup);
      writeSlot(localStore(store), key, backup);
      writeSlot(sessionStore(store), key, backup);
      restored += 1;
      continue;
    }
    if (!isEmptyDurableValue(local) && local != null) {
      if (!store) memory.set(key, local);
      writeSlot(sessionStore(store), key, local);
      if (isEmptyDurableValue(backup)) void mirrorToBackup(key, local);
    }
  }
  return restored;
}

async function flushPendingMirrors() {
  const entries = [...pendingMirrors.entries()];
  pendingMirrors.clear();
  for (const [key, value] of entries) {
    if (isEmptyDurableValue(value)) continue;
    if (testBackup) {
      const existing = testBackup.get(key) ?? null;
      if (shouldRestoreFromBackup(value, existing)) continue;
      testBackup.set(key, value);
      continue;
    }
    await mirrorToBackup(key, value);
  }
}

/**
 * First load: restore from IndexedDB with mirroring paused, then allow backup
 * mirrors. Idempotent. Marks hydrated when restore finishes (or times out).
 */
export function ensureDurableHydration(keys: readonly string[] = [], store?: Storage) {
  if (!initialHydration) {
    mirroringEnabled = false;
    initialHydration = (async () => {
      requestPersistentStorage();
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

      const finish = async (count: number) => {
        mirroringEnabled = true;
        await flushPendingMirrors().catch(() => {});
        markDurableHydrated();
        emitDurableStorage();
        return count;
      };

      if (timedOut) {
        void work
          .catch(() => 0)
          .then(async (late) => {
            await finish(late);
          });
        markDurableHydrated();
        emitDurableStorage();
        return 0;
      }

      const count = await work.catch(() => 0);
      return finish(count);
    })().catch(async () => {
      mirroringEnabled = true;
      await flushPendingMirrors().catch(() => {});
      markDurableHydrated();
      return 0;
    });
  }
  return initialHydration;
}

/** pageshow / visible: copy backup → local again without resetting boot. */
export function rerunDurableHydration(keys: readonly string[] = [], store?: Storage) {
  return hydrateDurableFromBackup(keys, store)
    .then((count) => {
      emitDurableStorage();
      return count;
    })
    .catch(() => 0);
}

export function flushDurableBackup() {
  return idbQueue;
}

export function requestPersistentStorage() {
  if (typeof navigator === "undefined") return;
  const storage = navigator.storage;
  if (!storage || typeof storage.persist !== "function") return;
  void storage.persist().catch(() => {
    // Safari often returns false — ignore.
  });
}

/** Re-read storage after iOS/Android standalone resume (pageshow / visible / focus). */
export function listenForAppResume(onResume: () => void) {
  if (typeof window === "undefined") return () => {};
  const onPageShow = () => onResume();
  const onFocus = () => onResume();
  const onVisibility = () => {
    if (document.visibilityState === "visible") onResume();
  };
  const onPageHide = () => {
    void flushDurableBackup();
  };
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  return () => {
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
  };
}

export function sameJson(a: unknown, b: unknown) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

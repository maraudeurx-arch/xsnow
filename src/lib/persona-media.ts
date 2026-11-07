/**
 * On-device media vault for « Monétise-toi : image et voix » deposits.
 *
 * Voice samples, photos, videos and biometric selfies are Blobs — far too
 * big for localStorage — so they live in their own IndexedDB database,
 * keyed `<depositId>:<kind>`. Metadata (never the media) is kept separately
 * in durable storage by persona-deposit.ts. Nothing here ever uploads:
 * the server-side storage route is activated by Indiana Lane (IA).
 *
 * Every operation is best-effort and resolves instead of throwing: a
 * missing IndexedDB (private mode, old WebView) must never break the flow.
 */

import type { PersonaMediaKind } from "./persona-deposit.ts";

export const PERSONA_MEDIA_DB_NAME = "xsnow-persona-bank";
export const PERSONA_MEDIA_STORE = "media";

export function personaMediaKey(depositId: string, kind: PersonaMediaKind): string {
  return `${depositId}:${kind}`;
}

/** Test helper — swap IndexedDB for an in-memory map (same pattern as durable-storage). */
let testStore: Map<string, Blob> | null = null;
export function setPersonaMediaStoreForTests(store: Map<string, Blob> | null) {
  testStore = store;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(PERSONA_MEDIA_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PERSONA_MEDIA_STORE)) {
        db.createObjectStore(PERSONA_MEDIA_STORE);
      }
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

export async function savePersonaMedia(
  depositId: string,
  kind: PersonaMediaKind,
  blob: Blob,
): Promise<boolean> {
  const key = personaMediaKey(depositId, kind);
  if (testStore) {
    testStore.set(key, blob);
    return true;
  }
  if (typeof indexedDB === "undefined") return false;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const req = db
        .transaction(PERSONA_MEDIA_STORE, "readwrite")
        .objectStore(PERSONA_MEDIA_STORE)
        .put(blob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch {
    return false;
  }
}

export async function loadPersonaMedia(
  depositId: string,
  kind: PersonaMediaKind,
): Promise<Blob | null> {
  const key = personaMediaKey(depositId, kind);
  if (testStore) return testStore.get(key) ?? null;
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db
        .transaction(PERSONA_MEDIA_STORE, "readonly")
        .objectStore(PERSONA_MEDIA_STORE)
        .get(key);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deletePersonaMedia(
  depositId: string,
  kind: PersonaMediaKind,
): Promise<void> {
  const key = personaMediaKey(depositId, kind);
  if (testStore) {
    testStore.delete(key);
    return;
  }
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const req = db
        .transaction(PERSONA_MEDIA_STORE, "readwrite")
        .objectStore(PERSONA_MEDIA_STORE)
        .delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Best-effort cleanup.
  }
}

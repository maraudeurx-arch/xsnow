/**
 * Session flag: welcome speech has ended, or autoplay was blocked after intent.
 * The first-visit geo sheet waits on this so it never appears before avatar + speech.
 */

export const WELCOME_GATE_KEY = "xsnow.welcomeGate";

const listeners = new Set<() => void>();
let cached: boolean | undefined;
let inFlight = false;

function emit() {
  cached = undefined;
  listeners.forEach((listener) => listener());
}

function storageOf(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function subscribeWelcomeGate(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function readWelcomeGate(): boolean {
  if (cached !== undefined) return cached;
  const storage = storageOf();
  if (!storage) {
    cached = false;
    return false;
  }
  try {
    const open = storage.getItem(WELCOME_GATE_KEY) === "open";
    cached = open;
    return open;
  } catch {
    cached = false;
    return false;
  }
}

export function beginWelcomeIntent() {
  inFlight = true;
}

export function isWelcomeInFlight() {
  return inFlight;
}

export function openWelcomeGate() {
  inFlight = false;
  const storage = storageOf();
  if (storage) {
    try {
      storage.setItem(WELCOME_GATE_KEY, "open");
    } catch {
      // Private mode — in-memory cache still opens the gate this session.
    }
  }
  cached = true;
  emit();
}

/** Test helper — drop the in-memory cache between cases. */
export function resetWelcomeGateCache() {
  cached = undefined;
  inFlight = false;
}

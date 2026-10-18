"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readStoredAvatar } from "@/lib/device-memory";
import { normalizeScreenPath, rememberScreen, resumeTarget } from "@/lib/last-screen";
import { useDeviceMemoryReady } from "@/lib/useDeviceMemoryReady";

/** One decision per page load (survives client navigations and Strict Mode re-runs). */
let launchDecided = false;

function isStandalone() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

function localStore(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * iPhone Home Screen app: reopen on the screen the visitor left (24 h max),
 * instead of Accueil. New visitors (no avatar yet) always start on Accueil.
 */
export function LastScreenResume() {
  const pathname = usePathname();
  const router = useRouter();
  // Wait for the IndexedDB restore so a returning visitor is not taken for a new one.
  const memoryReady = useDeviceMemoryReady();

  useEffect(() => {
    if (!pathname) return;
    const storage = localStore();
    // Only a launch on Accueil can resume; any other first screen is remembered at once.
    if (!launchDecided && normalizeScreenPath(pathname) !== "/") launchDecided = true;
    if (!launchDecided) {
      if (!memoryReady) return;
      launchDecided = true;
      const target = resumeTarget(storage, {
        pathname,
        search: window.location.search,
        hash: window.location.hash,
        standalone: isStandalone(),
        hasAvatar: Boolean(readStoredAvatar()),
        now: Date.now(),
      });
      if (target) {
        router.replace(target);
        return;
      }
    }
    rememberScreen(storage, pathname, Date.now());
  }, [pathname, memoryReady, router]);

  return null;
}

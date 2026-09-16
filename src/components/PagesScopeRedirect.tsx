"use client";

import { useEffect } from "react";
import { needsGithubPagesScopeRedirect, PUBLIC_SITE_URL } from "@/lib/paths";

/**
 * Last-resort client redirect if a Home Screen shortcut (or typed URL) boots
 * our JS on github.io without `/xsnow/`. GitHub’s own org-root 404 page does
 * not run this — that case is covered by install-guide copy.
 */
export function PagesScopeRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!needsGithubPagesScopeRedirect(window.location)) return;
    window.location.replace(PUBLIC_SITE_URL);
  }, []);
  return null;
}

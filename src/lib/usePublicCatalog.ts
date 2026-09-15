"use client";

import { useEffect, useState } from "react";
import { EMPTY_PUBLIC_CATALOG, loadPublicCatalog, type PublicCatalog } from "./public-catalog";

/** Approved community catalog for this app version. Empty on soft launch / fetch failure. */
export function usePublicCatalog() {
  const [catalog, setCatalog] = useState<PublicCatalog>(EMPTY_PUBLIC_CATALOG);

  useEffect(() => {
    let live = true;
    void loadPublicCatalog().then((next) => {
      if (live) setCatalog(next);
    });
    return () => {
      live = false;
    };
  }, []);

  return catalog;
}

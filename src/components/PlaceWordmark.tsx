"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";

export function PlaceWordmark() {
  const { placeName } = usePlace();
  return <span className="block max-w-[46vw] truncate">{placeName}</span>;
}

/** Static export can't bake a live city into <title>; sync the tab once place is known. */
export function PlaceDocumentTitle() {
  const { placeName } = usePlace();
  const { m } = useI18n();

  useEffect(() => {
    document.title = `${placeName} — ${m.brand.community}`;
  }, [m.brand.community, placeName]);

  return null;
}

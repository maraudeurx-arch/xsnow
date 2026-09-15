"use client";

import { usePlace } from "@/lib/place";

export function PlaceWordmark() {
  const { placeName } = usePlace();
  return <span className="block max-w-[46vw] truncate">{placeName}</span>;
}

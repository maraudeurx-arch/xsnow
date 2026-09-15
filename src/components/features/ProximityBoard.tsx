"use client";

import { useState } from "react";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";

const NEARBY = [
  { nameKey: "cafe" as const, kindKey: "commerce" as const, distance: "120 m" },
  { nameKey: "nadia" as const, kindKey: "help" as const, distance: "180 m" },
  { nameKey: "atelier" as const, kindKey: "business" as const, distance: "350 m" },
  { nameKey: "marc" as const, kindKey: "community" as const, distance: "420 m" },
  { nameKey: "epicerie" as const, kindKey: "commerce" as const, distance: "510 m" },
];

export function ProximityBoard() {
  const { m } = useI18n();
  const { consent, requestLocation } = usePlace();
  const [status, setStatus] = useState<string | null>(null);
  const shown = status ?? m.proximity.demo;

  function locate() {
    if (consent !== "granted") {
      requestLocation();
      return;
    }
    if (!navigator.geolocation) {
      setStatus(m.proximity.unsupported);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus(
          interpolate(m.proximity.received, {
            lat: pos.coords.latitude.toFixed(3),
            lon: pos.coords.longitude.toFixed(3),
          }),
        );
      },
      () => {
        setStatus(m.proximity.denied);
      },
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={locate}
        className="tap w-full rounded-full bg-cobalt font-extrabold text-snow"
      >
        {m.proximity.activate}
      </button>
      <p className="text-sm text-snow/75">{shown}</p>
      <ul className="space-y-2">
        {NEARBY.map((item) => (
          <li
            key={item.nameKey}
            className="flex min-h-11 items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3"
          >
            <span>
              <span className="block font-semibold">{m.proximity.people[item.nameKey]}</span>
              <span className="text-xs text-ice/70">{m.proximity.kinds[item.kindKey]}</span>
            </span>
            <span className="text-sm font-bold text-gold">{item.distance}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

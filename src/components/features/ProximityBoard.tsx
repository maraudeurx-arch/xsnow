"use client";

import { useState } from "react";

const NEARBY = [
  { name: "Café des Pins", kind: "Commerce", distance: "120 m" },
  { name: "Nadia · voisine", kind: "Entraide", distance: "180 m" },
  { name: "Atelier Vélo-Nord", kind: "Business", distance: "350 m" },
  { name: "Marc · parent d’élève", kind: "Communauté", distance: "420 m" },
  { name: "Épicerie Hochelaga", kind: "Commerce", distance: "510 m" },
];

export function ProximityBoard() {
  const [status, setStatus] = useState("La liste ci-dessous est un quartier démo (Montréal).");

  function locate() {
    if (!navigator.geolocation) {
      setStatus("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus(
          `Position reçue (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}). Les voisins réels seront branchés après la construction.`,
        );
      },
      () => {
        setStatus("Position refusée. On reste sur le quartier démo — l’entraide n’attend pas.");
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
        Activer ma position
      </button>
      <p className="text-sm text-snow/75">{status}</p>
      <ul className="space-y-2">
        {NEARBY.map((item) => (
          <li
            key={item.name}
            className="flex min-h-11 items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3"
          >
            <span>
              <span className="block font-semibold">{item.name}</span>
              <span className="text-xs text-ice/70">{item.kind}</span>
            </span>
            <span className="text-sm font-bold text-gold">{item.distance}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

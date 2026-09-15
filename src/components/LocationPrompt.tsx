"use client";

import { usePlace } from "@/lib/place";

export function LocationPrompt() {
  const { locating, error, requestLocation, skipLocation } = usePlace();

  return (
    <section
      className="w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,26,0.92)_0%,rgba(8,8,10,0.92)_100%)] p-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
      aria-label="Autoriser la position"
    >
      <p className="text-[13px] font-extrabold tracking-wide text-snow">
        Où es-tu en ce moment ?
      </p>
      <p className="mt-1.5 text-[12px] leading-snug text-snow/85">
        Autorise ta position pour afficher le nom de ta ville (et, plus tard, tes
        voisins à proximité). Rien n’est envoyé à un serveur de suivi — seulement
        ta ville, sur cet appareil.
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        <button
          type="button"
          className="tap w-full rounded-full border border-cobalt/55 bg-cobalt px-3 text-[12px] font-extrabold text-snow disabled:opacity-60"
          disabled={locating}
          onClick={requestLocation}
        >
          {locating ? "Recherche de ta ville…" : "Autoriser ma position"}
        </button>
        <button
          type="button"
          className="tap w-full rounded-full border border-white/20 bg-white/[0.06] px-3 text-[12px] font-semibold text-snow/90 disabled:opacity-60"
          disabled={locating}
          onClick={skipLocation}
        >
          Plus tard — rester à Gatineau
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-[11px] leading-snug text-gold" role="status">
          {error}
        </p>
      ) : null}
    </section>
  );
}

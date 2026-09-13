"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ACCUEIL_MENU } from "@/lib/content";
import { useSpeech } from "@/lib/speech";

export function AccueilMenu() {
  const pathname = usePathname();
  const { isSpeaking, speak } = useSpeech();
  const [open, setOpen] = useState(
    ACCUEIL_MENU.some((item) => item.href === pathname),
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        className={`tap min-w-[9.5rem] rounded-full border border-ice/40 bg-white/10 px-6 text-base font-extrabold tracking-wide text-snow backdrop-blur-md ${
          isSpeaking ? "menu-pulse" : ""
        }`}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) {
            speak(
              "Accueil. Voici Reportage, Séries TV, Dessins animés et Vos attributs. Choisissez une rubrique.",
            );
          }
        }}
      >
        Accueil
      </button>

      {open ? (
        <ul className="flex w-[min(100%,18rem)] flex-col gap-2">
          {ACCUEIL_MENU.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => speak(item.speech)}
                  className={`tap flex items-center justify-center rounded-2xl border px-3 text-sm font-semibold ${
                    active
                      ? "border-gold/70 bg-gold/15 text-gold"
                      : "border-white/10 bg-white/5 text-snow hover:border-ice/40"
                  } ${isSpeaking ? "menu-pulse" : ""}`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

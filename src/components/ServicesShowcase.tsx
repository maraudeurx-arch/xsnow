"use client";

import Link from "next/link";
import { SERVICE_LIST } from "@/lib/services";
import { useSpeech } from "@/lib/speech";

export function ServicesShowcase() {
  const { isSpeaking, speak } = useSpeech();

  return (
    <section className="w-full max-w-xl px-2" aria-labelledby="services-heading">
      <div className="mb-3 text-center">
        <p className="text-[11px] font-extrabold tracking-[0.2em] text-gold uppercase">
          Open-Community
        </p>
        <h2 id="services-heading" className="font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">
          Services
        </h2>
        <p className="mt-1 text-sm text-ice/80">
          Premiers services monétisables du quartier. Choisissez une carte.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {SERVICE_LIST.map((service) => (
          <li key={service.kind}>
            <Link
              href={service.href}
              onClick={() => speak(service.speech)}
              className={`tap flex min-h-[4.5rem] flex-col justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-gold/50 hover:bg-gold/10 ${
                isSpeaking ? "menu-pulse" : ""
              }`}
            >
              <span className="font-extrabold text-snow">{service.title}</span>
              <span className="mt-1 text-xs leading-snug text-ice/75">{service.short}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

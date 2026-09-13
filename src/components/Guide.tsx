"use client";

import Image from "next/image";
import { WELCOME_SPEECH } from "@/lib/content";
import { useSpeech } from "@/lib/speech";

export function Guide() {
  const { isSpeaking, lastText, replay, speak } = useSpeech();

  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-4 px-2">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-white px-4 py-3 text-night shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
        <p className="text-[15px] leading-relaxed font-medium">{lastText}</p>
        <button
          type="button"
          className="tap mt-3 inline-flex items-center justify-center rounded-full bg-night px-4 text-sm font-extrabold text-gold"
          onClick={() => {
            if (lastText === WELCOME_SPEECH) {
              replay();
            } else {
              speak(lastText);
            }
          }}
        >
          Réécouter
        </button>
        <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
      </div>

      <figure
        className={`idle-float relative mt-2 ${isSpeaking ? "speak-glow" : ""}`}
      >
        <Image
          src="/guide.png"
          alt="Guide Xsnow, professionnel en veston sombre, les bras croisés"
          width={360}
          height={480}
          priority
          className="h-auto w-[min(72vw,280px)] rounded-[2rem] object-cover object-top"
        />
      </figure>
    </section>
  );
}

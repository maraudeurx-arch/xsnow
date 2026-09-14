"use client";

import { BUBBLE_INTRO, WELCOME_SPEECH } from "@/lib/content";
import { assetUrl } from "@/lib/paths";
import { useSpeech } from "@/lib/speech";

export function Guide() {
  const { lastText, replay, speak } = useSpeech();

  return (
    <section className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-2">
      <figure className="idle-float relative flex min-h-0 max-h-full items-center justify-center">
        {/* Plain img: next/image omitted basePath and served /guide.png (404 on Pages). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assetUrl("/guide.png")}
          alt="Guide Xsnow, professionnel en veston sombre, les bras croisés"
          width={420}
          height={560}
          fetchPriority="high"
          decoding="async"
          className="h-auto max-h-[min(56dvh,400px)] w-auto max-w-[min(74vw,280px)] rounded-[1.5rem] object-contain object-top"
        />
      </figure>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-snow/65"
        aria-label="Réécouter"
        onClick={() => {
          if (lastText === BUBBLE_INTRO || lastText === WELCOME_SPEECH) {
            replay();
          } else {
            speak(lastText);
          }
        }}
      >
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="h-3 w-3 fill-current"
        >
          <path d="M2.5 6.2v3.6c0 .4.3.7.7.7h1.7l3 2.4c.5.4 1.1 0 1.1-.6V3.7c0-.6-.6-1-1.1-.6l-3 2.4H3.2c-.4 0-.7.3-.7.7Zm8.2 4.4a.6.6 0 0 0 .1-.8 2.6 2.6 0 0 0 0-3.6.6.6 0 1 0-.9.8 1.4 1.4 0 0 1 0 2c.2.3.6.3.8 0Zm1.6 1.5a.6.6 0 0 0 .1-.9 4.8 4.8 0 0 0 0-6.4.6.6 0 1 0-.9.8 3.6 3.6 0 0 1 0 4.8c.2.3.6.3.8 0Z" />
        </svg>
        Réécouter
      </button>
    </section>
  );
}

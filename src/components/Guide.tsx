"use client";

import { useState } from "react";
import { AvatarDisc } from "@/components/AvatarDisc";
import { AVATARS, avatarById } from "@/lib/avatars";
import { BUBBLE_INTRO, WELCOME_SPEECH } from "@/lib/content";
import { useSpeech, useWelcomeAutoplay } from "@/lib/speech";
import { useStoredAvatar } from "@/lib/useStoredAvatar";

const pickerSize =
  "size-[min(26vw,17dvh,6.6rem)] sm:size-[min(22vw,8.5rem)]";
const chosenSize =
  "size-[min(42vw,34dvh,12.5rem)] sm:size-[min(36vw,16rem)]";

export function Guide() {
  const [avatarId, setAvatarId] = useStoredAvatar();
  const [picking, setPicking] = useState(false);
  useWelcomeAutoplay();

  const showPicker = !avatarId || picking;
  const chosen = avatarId ? avatarById(avatarId) : null;

  return (
    <section className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-1.5">
      {showPicker ? (
        <div
          role="group"
          aria-label="Choisis ton avatar"
          className="flex min-h-0 w-full flex-col items-center gap-1.5"
        >
          <p className="text-[13px] leading-none font-extrabold tracking-wide text-snow sm:text-sm">
            Choisis ton avatar
          </p>
          <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-3 p-1 sm:gap-x-5 sm:gap-y-4">
            {AVATARS.map((avatar) => {
              const selected = avatar.id === avatarId;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
                  aria-label={avatar.label}
                  aria-pressed={selected}
                  onClick={() => {
                    setAvatarId(avatar.id);
                    setPicking(false);
                  }}
                >
                  <AvatarDisc
                    avatar={avatar}
                    className={pickerSize}
                    selected={selected}
                    priority
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : chosen ? (
        <figure className="idle-float relative flex min-h-0 max-h-full items-center justify-center">
          <AvatarDisc avatar={chosen} className={chosenSize} priority />
        </figure>
      ) : null}

      <ReplayButton />

      {chosen && !showPicker ? (
        <button
          type="button"
          className="rounded-full border border-white/20 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-snow/90 hover:border-violet/50 hover:bg-white/[0.07]"
          onClick={() => setPicking(true)}
        >
          Changer d’avatar
        </button>
      ) : null}
    </section>
  );
}

function ReplayButton() {
  const { lastText, replay, speak } = useSpeech();

  return (
    <button
      type="button"
      data-welcome-replay
      className="inline-flex items-center gap-1 rounded-full border border-cobalt/55 bg-cobalt px-2 py-0.5 text-[10px] font-semibold tracking-wide text-snow shadow-[0_4px_14px_rgba(37,99,235,0.32)]"
      aria-label="Réécouter"
      onClick={() => {
        if (lastText === BUBBLE_INTRO || lastText === WELCOME_SPEECH) {
          replay();
        } else {
          speak(lastText);
        }
      }}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3 fill-current">
        <path d="M2.5 6.2v3.6c0 .4.3.7.7.7h1.7l3 2.4c.5.4 1.1 0 1.1-.6V3.7c0-.6-.6-1-1.1-.6l-3 2.4H3.2c-.4 0-.7.3-.7.7Zm8.2 4.4a.6.6 0 0 0 .1-.8 2.6 2.6 0 0 0 0-3.6.6.6 0 1 0-.9.8 1.4 1.4 0 0 1 0 2c.2.3.6.3.8 0Zm1.6 1.5a.6.6 0 0 0 .1-.9 4.8 4.8 0 0 0 0-6.4.6.6 0 1 0-.9.8 3.6 3.6 0 0 1 0 4.8c.2.3.6.3.8 0Z" />
      </svg>
      Réécouter
    </button>
  );
}

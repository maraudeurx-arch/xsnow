"use client";

import { useState } from "react";
import { AvatarDisc } from "@/components/AvatarDisc";
import { AVATARS, avatarById, type Avatar, type AvatarId } from "@/lib/avatars";
import { welcomeSpeechFor } from "@/lib/content";
import { useI18n } from "@/lib/i18n/locale";
import { hasPlayedWelcomeFor, markWelcomePlayed } from "@/lib/device-memory";
import { usePlace } from "@/lib/place";
import { useSpeech, type SpeakOptions } from "@/lib/speech";
import { useStoredAvatar } from "@/lib/useStoredAvatar";
import { useDeviceMemoryReady } from "@/lib/useDeviceMemoryReady";
import {
  beginWelcomeIntent,
  openWelcomeGate,
  readWelcomeGate,
} from "@/lib/welcome-gate";
import { WELCOME_AUTOPLAY_GRACE_MS } from "@/lib/welcome-place";

const pickerSize =
  "size-[min(22vw,14dvh,5.5rem)] sm:size-[min(18vw,7rem)]";

const btnClass =
  "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-cobalt/55 bg-cobalt px-3 text-xs font-semibold tracking-wide text-snow shadow-[0_4px_14px_rgba(37,99,235,0.32)]";

const secondaryBtnClass =
  "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-3 text-xs font-semibold tracking-wide text-snow hover:border-violet/50 hover:bg-white/[0.09]";

export function ProfileAvatarControls() {
  const [avatarId, setAvatarId] = useStoredAvatar();
  const memoryReady = useDeviceMemoryReady();
  const [picking, setPicking] = useState(false);
  const { speak, prime, replay } = useSpeech();
  const { city } = usePlace();
  const { locale, m } = useI18n();

  const chosen = avatarId ? avatarById(avatarId) : null;
  const waiting = !memoryReady && !avatarId;

  function playWelcome(gender: Avatar["gender"]) {
    beginWelcomeIntent();
    let engineStarted = false;
    const grace = window.setTimeout(() => {
      if (!engineStarted) openWelcomeGate();
    }, WELCOME_AUTOPLAY_GRACE_MS);
    const options: SpeakOptions = {
      onEngineStart: () => {
        engineStarted = true;
      },
      onSettled: () => {
        window.clearTimeout(grace);
        openWelcomeGate();
      },
    };
    speak(welcomeSpeechFor(city, locale), gender, options);
  }

  function chooseAvatar(id: AvatarId) {
    const next = avatarById(id);
    prime();
    if (!hasPlayedWelcomeFor(id)) {
      markWelcomePlayed(id);
      playWelcome(next.gender);
    } else if (!readWelcomeGate()) {
      openWelcomeGate();
    }
    setAvatarId(id);
    setPicking(false);
  }

  if (waiting) {
    return (
      <section
        className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
        data-device-memory-pending
        aria-busy="true"
      >
        <div className="min-h-11" />
      </section>
    );
  }

  if (picking || !chosen) {
    return (
      <section
        className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
        data-profile-avatar-picker
      >
        <p className="text-sm font-extrabold text-snow">{m.guide.pickAvatar}</p>
        <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-3 p-1">
          {AVATARS.map((avatar) => {
            const selected = avatar.id === avatarId;
            const label = m.guide.avatars[avatar.id];
            return (
              <button
                key={avatar.id}
                type="button"
                className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
                aria-label={label}
                aria-pressed={selected}
                onClick={() => chooseAvatar(avatar.id)}
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
        {chosen ? (
          <button
            type="button"
            className={secondaryBtnClass}
            onClick={() => setPicking(false)}
          >
            {m.register.cancel}
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
      data-profile-avatar-controls
    >
      <div className="flex items-center gap-3">
        <AvatarDisc avatar={chosen} className="size-14 shrink-0" priority />
        <p className="min-w-0 flex-1 text-sm font-extrabold text-snow">
          {m.guide.avatars[chosen.id]}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          data-welcome-replay
          className={btnClass}
          aria-label={m.guide.replay}
          onClick={() => replay(chosen.gender)}
        >
          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
            <path d="M2.5 6.2v3.6c0 .4.3.7.7.7h1.7l3 2.4c.5.4 1.1 0 1.1-.6V3.7c0-.6-.6-1-1.1-.6l-3 2.4H3.2c-.4 0-.7.3-.7.7Zm8.2 4.4a.6.6 0 0 0 .1-.8 2.6 2.6 0 0 0 0-3.6.6.6 0 1 0-.9.8 1.4 1.4 0 0 1 0 2c.2.3.6.3.8 0Zm1.6 1.5a.6.6 0 0 0 .1-.9 4.8 4.8 0 0 0 0-6.4.6.6 0 1 0-.9.8 3.6 3.6 0 0 1 0 4.8c.2.3.6.3.8 0Z" />
          </svg>
          {m.guide.replay}
        </button>
        <button
          type="button"
          className={secondaryBtnClass}
          onClick={() => setPicking(true)}
        >
          {m.guide.changeAvatar}
        </button>
      </div>
    </section>
  );
}

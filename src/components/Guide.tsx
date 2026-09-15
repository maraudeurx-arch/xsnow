"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AvatarChat } from "@/components/AvatarChat";
import { AvatarDisc } from "@/components/AvatarDisc";
import { LocationPrompt } from "@/components/LocationPrompt";
import { useNeedsConsentSheet } from "@/components/ConsentSheet";
import { InstallTip } from "@/components/InstallTip";
import { AVATARS, avatarById, type Avatar, type AvatarId } from "@/lib/avatars";
import { welcomeSpeechFor } from "@/lib/content";
import { useI18n } from "@/lib/i18n/locale";
import { PUBLIC_SITE_URL } from "@/lib/paths";
import { usePlace } from "@/lib/place";
import {
  hasPlayedWelcomeFor,
  markWelcomePlayed,
  useSpeech,
} from "@/lib/speech";
import { useStoredAvatar } from "@/lib/useStoredAvatar";

const pickerSize =
  "size-[min(26vw,17dvh,6.6rem)] sm:size-[min(22vw,8.5rem)]";
const chosenSize = "size-[var(--home-avatar)]";

const shortcutClass =
  "inline-flex min-h-[var(--home-chip-h)] w-full items-center justify-center rounded-lg border border-gold/65 bg-[rgba(8,8,12,0.92)] px-2 text-center text-[11px] font-extrabold leading-tight text-gold shadow-[0_4px_12px_rgba(0,0,0,0.3)]";

export function Guide() {
  const [avatarId, setAvatarId] = useStoredAvatar();
  const [picking, setPicking] = useState(false);
  const { speak } = useSpeech();
  const { city, ready, needsPrompt } = usePlace();
  const { locale, m } = useI18n();
  const waitingOnConsent = useNeedsConsentSheet();

  const showPicker = !avatarId || picking;
  const chosen = avatarId ? avatarById(avatarId) : null;

  function chooseAvatar(id: AvatarId) {
    setAvatarId(id);
    setPicking(false);
  }

  useEffect(() => {
    if (!chosen || !ready || waitingOnConsent) return;
    if (hasPlayedWelcomeFor(chosen.id)) return;
    markWelcomePlayed(chosen.id);
    speak(welcomeSpeechFor(city, locale), chosen.gender);
  }, [chosen, city, locale, ready, speak, waitingOnConsent]);

  return (
    <section
      className={`flex min-h-0 w-full flex-col ${
        showPicker
          ? "h-full flex-1 items-center justify-center gap-1.5"
          : "items-stretch justify-center gap-0 self-stretch"
      }`}
    >
      {showPicker ? (
        <div
          role="group"
          aria-label={m.guide.pickAvatar}
          className="home-stage flex min-h-0 w-full flex-col items-center gap-1.5 rounded-2xl px-3 py-3"
        >
          <p className="text-[13px] leading-none font-extrabold tracking-wide text-snow [text-shadow:0_2px_10px_rgba(0,0,0,0.7)] sm:text-sm">
            {m.guide.pickAvatar}
          </p>
          <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-3 p-1 sm:gap-x-5 sm:gap-y-4">
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
        </div>
      ) : chosen ? (
        <div className="home-stage flex w-full flex-col gap-[var(--home-gap)] rounded-2xl px-2 py-1.5">
          <div className="flex shrink-0 items-center gap-2">
            <AvatarDisc avatar={chosen} className={chosenSize} priority />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <ReplayButton gender={chosen.gender} />
              <button
                type="button"
                className="inline-flex min-h-[var(--home-chip-h)] min-w-0 flex-1 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-2 text-[11px] font-semibold tracking-wide text-snow hover:border-violet/50 hover:bg-white/[0.09]"
                onClick={() => setPicking(true)}
              >
                {m.guide.changeAvatar}
              </button>
            </div>
          </div>
          <nav
            aria-label={m.guide.offerShortcuts}
            className="grid shrink-0 grid-cols-2 gap-1.5"
          >
            <Link href="/gagner-maintenant" className={shortcutClass}>
              {m.menu.gagnerMaintenant}
            </Link>
            <Link href="/vos-idees/#form" className={shortcutClass}>
              {m.nav.vosIdees}
            </Link>
            <ShareHomeButton />
          </nav>
          <InstallTip compact />
          {needsPrompt && !waitingOnConsent ? (
            <LocationPrompt />
          ) : (
            <AvatarChat avatar={chosen} />
          )}
        </div>
      ) : null}
    </section>
  );
}

function ShareHomeButton() {
  const router = useRouter();
  const { m } = useI18n();

  async function shareApp() {
    const payload = {
      title: "Open Community",
      text: m.guide.shareText,
      url: PUBLIC_SITE_URL,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
    }
    router.push("/mon-profil/inviter");
  }

  return (
    <button
      type="button"
      className={`${shortcutClass} col-span-2`}
      onClick={() => void shareApp()}
    >
      {m.shareOpc.short}
    </button>
  );
}

function ReplayButton({ gender }: { gender: Avatar["gender"] }) {
  const { replay } = useSpeech();
  const { m } = useI18n();

  return (
    <button
      type="button"
      data-welcome-replay
      className="inline-flex min-h-[var(--home-chip-h)] min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-cobalt/55 bg-cobalt px-2 text-[11px] font-semibold tracking-wide text-snow shadow-[0_4px_14px_rgba(37,99,235,0.32)]"
      aria-label={m.guide.replay}
      onClick={() => replay(gender)}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3 fill-current">
        <path d="M2.5 6.2v3.6c0 .4.3.7.7.7h1.7l3 2.4c.5.4 1.1 0 1.1-.6V3.7c0-.6-.6-1-1.1-.6l-3 2.4H3.2c-.4 0-.7.3-.7.7Zm8.2 4.4a.6.6 0 0 0 .1-.8 2.6 2.6 0 0 0 0-3.6.6.6 0 1 0-.9.8 1.4 1.4 0 0 1 0 2c.2.3.6.3.8 0Zm1.6 1.5a.6.6 0 0 0 .1-.9 4.8 4.8 0 0 0 0-6.4.6.6 0 1 0-.9.8 3.6 3.6 0 0 1 0 4.8c.2.3.6.3.8 0Z" />
      </svg>
      {m.guide.replay}
    </button>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AvatarChat } from "@/components/AvatarChat";
import {
  NeighborhoodNews,
  type NeighborhoodNewsState,
} from "@/components/NeighborhoodNews";
import { AvatarDisc } from "@/components/AvatarDisc";
import { LocationPrompt } from "@/components/LocationPrompt";
import {
  useConsentUnanswered,
  useWelcomeGate,
} from "@/components/ConsentSheet";
import { AVATARS, avatarById, type Avatar, type AvatarId } from "@/lib/avatars";
import { welcomeSpeechFor } from "@/lib/content";
import { useI18n } from "@/lib/i18n/locale";
import { PUBLIC_SITE_URL } from "@/lib/paths";
import { usePlace } from "@/lib/place";
import { hasPlayedWelcomeFor, markWelcomePlayed } from "@/lib/device-memory";
import { useSpeech, type SpeakOptions } from "@/lib/speech";
import {
  beginWelcomeIntent,
  isWelcomeInFlight,
  openWelcomeGate,
  readWelcomeGate,
} from "@/lib/welcome-gate";
import {
  WELCOME_AUTOPLAY_GRACE_MS,
  welcomeSpeechReady,
} from "@/lib/welcome-place";
import { useStoredAvatar } from "@/lib/useStoredAvatar";

const pickerSize =
  "size-[min(26vw,17dvh,6.6rem)] sm:size-[min(22vw,8.5rem)]";
const chosenSize = "size-[var(--home-avatar)]";

const shortcutClass =
  "inline-flex min-h-[var(--home-chip-h)] w-full items-center justify-center rounded-lg border border-cobalt/55 bg-cobalt px-1.5 text-center text-[10px] font-extrabold leading-tight text-snow shadow-[0_4px_14px_rgba(37,99,235,0.28)]";

export function Guide() {
  const [avatarId, setAvatarId] = useStoredAvatar();
  const [picking, setPicking] = useState(false);
  const [newsHeadlines, setNewsHeadlines] = useState("");
  const onNewsChange = useCallback((state: NeighborhoodNewsState) => {
    setNewsHeadlines(state.headlineLine);
  }, []);
  const { speak, prime } = useSpeech();
  const { city, needsPrompt, resolved } = usePlace();
  const { locale, m } = useI18n();
  const unanswered = useConsentUnanswered();
  const welcomeGateOpen = useWelcomeGate();

  const showPicker = !avatarId || picking;
  const chosen = avatarId ? avatarById(avatarId) : null;

  const playWelcome = useCallback(
    (gender: Avatar["gender"]) => {
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
    },
    [city, locale, speak],
  );

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

  useEffect(() => {
    if (!chosen) return;
    if (!welcomeSpeechReady({ hasAvatar: true })) return;
    if (readWelcomeGate() || isWelcomeInFlight()) return;
    // Returning visitor: avatar already on this device. Do not auto-play
    // welcome on reload — Réécouter is there if they want it again.
    openWelcomeGate();
  }, [chosen]);

  return (
    <section
      id="home-guide"
      className={`flex min-h-0 w-full flex-col ${
        showPicker
          ? "items-center justify-center gap-3"
          : "min-h-0 flex-1 items-stretch justify-start gap-0 self-stretch"
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
        <div className="home-stage grid h-full min-h-0 w-full flex-1 grow grid-rows-[auto_minmax(0,1fr)_auto] gap-y-[var(--home-news-chat-gap)] overflow-hidden rounded-2xl px-[var(--home-card-pad-x)] py-[var(--home-card-pad-y)]">
          <div className="flex shrink-0 flex-col gap-[var(--home-stack-gap)]">
            <div className="flex items-center gap-2">
              <AvatarDisc avatar={chosen} className={chosenSize} priority />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <ReplayButton gender={chosen.gender} />
                <button
                  type="button"
                  className="inline-flex min-h-[var(--home-chip-h)] min-w-0 flex-1 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-2 text-[10px] font-semibold tracking-wide text-snow hover:border-violet/50 hover:bg-white/[0.09]"
                  onClick={() => setPicking(true)}
                >
                  {m.guide.changeAvatar}
                </button>
              </div>
            </div>
            <nav
              aria-label={m.guide.offerShortcuts}
              className="grid shrink-0 grid-cols-2 gap-[var(--home-chip-gap)]"
            >
              <Link href="/gagner-maintenant" className={shortcutClass}>
                {m.menu.gagnerMaintenant}
              </Link>
              <Link href="/vos-idees/#form" className={shortcutClass}>
                {m.nav.vosIdees}
              </Link>
              <ShareHomeButton />
            </nav>
          </div>
          <NeighborhoodNews onNewsChange={onNewsChange} />
          <div className="flex shrink-0 flex-col">
            {needsPrompt && !unanswered && Boolean(avatarId) && welcomeGateOpen ? (
              <LocationPrompt />
            ) : (
              <AvatarChat
                avatar={chosen}
                newsHeadlines={resolved ? newsHeadlines : ""}
              />
            )}
          </div>
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
      className="inline-flex min-h-[var(--home-chip-h)] min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-cobalt/55 bg-cobalt px-2 text-[10px] font-semibold tracking-wide text-snow shadow-[0_4px_14px_rgba(37,99,235,0.32)]"
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

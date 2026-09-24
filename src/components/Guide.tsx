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
import { hrefWithLang } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { PARTNER_REGISTER_HREF } from "@/lib/partner-ads";
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
import { useDeviceMemoryReady } from "@/lib/useDeviceMemoryReady";

const pickerSize =
  "size-[min(26vw,17dvh,6.6rem)] sm:size-[min(22vw,8.5rem)]";

const shortcutClass =
  "inline-flex min-h-[var(--home-chip-h)] w-full items-center justify-center rounded-full border border-transparent bg-cobalt px-1 text-center text-[length:var(--home-chip-font)] font-bold leading-none text-white shadow-[0_3px_8px_rgba(0,110,253,0.18)]";

export function Guide() {
  const [avatarId, setAvatarId] = useStoredAvatar();
  const memoryReady = useDeviceMemoryReady();
  const [picking, setPicking] = useState(false);
  const [newsHeadlines, setNewsHeadlines] = useState("");
  const onNewsChange = useCallback((state: NeighborhoodNewsState) => {
    setNewsHeadlines(state.headlineLine);
  }, []);
  const { speak, prime } = useSpeech();
  const { city, needsPrompt, resolved } = usePlace();
  const { locale, m, source } = useI18n();
  const unanswered = useConsentUnanswered();
  const welcomeGateOpen = useWelcomeGate();

  // Wait for IndexedDB restore before treating empty as a new visitor (PR #75).
  const waitingForMemory = !memoryReady && !avatarId;
  const showPicker = picking || (memoryReady && !avatarId);
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
    // welcome on reload — Réécouter is available in Mon profil instead.
    openWelcomeGate();
  }, [chosen]);

  return (
    <section
      id="home-guide"
      className={`flex min-h-0 w-full flex-col ${
        waitingForMemory || showPicker
          ? "items-center justify-center gap-3"
          : "min-h-0 flex-1 items-stretch justify-start gap-0 self-stretch"
      }`}
    >
      {waitingForMemory ? (
        <div
          data-device-memory-pending
          aria-busy="true"
          className="home-stage flex min-h-0 w-full flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3"
        />
      ) : showPicker ? (
        <div
          role="group"
          aria-label={m.guide.pickAvatar}
          className="home-stage flex h-full min-h-0 w-full flex-col items-center justify-center gap-4 overflow-y-auto rounded-2xl px-4 py-4"
          data-avatar-picker
        >
          <div className="w-full max-w-sm space-y-2 text-center">
            <p className="text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-2xl">
              {m.guide.introTitle}
            </p>
            <ul className="mx-auto max-w-[22rem] space-y-1 text-left text-sm leading-snug text-slate-700">
              {m.guide.introBenefits.map((line) => (
                <li key={line} className="flex gap-1.5">
                  <span aria-hidden className="shrink-0 text-gold">
                    –
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm leading-snug text-slate-600">
              * {m.guide.introDisclaimer}
            </p>
          </div>
          <p className="text-base leading-none font-extrabold tracking-tight text-slate-900">
            {m.guide.pickAvatar}
          </p>
          <div
            data-avatar-grid
            className="mx-auto grid w-fit max-w-full grid-cols-2 place-items-center gap-x-6 gap-y-4 p-1 sm:gap-x-8 sm:gap-y-5"
          >
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
        <div className="home-stage grid h-full min-h-0 w-full flex-1 grow grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl px-[var(--home-card-pad-x)] py-[var(--home-card-pad-y)]">
          <div className="flex shrink-0 flex-col gap-[var(--home-stack-gap)]">
            <nav
              aria-label={m.guide.offerShortcuts}
              className="grid shrink-0 grid-cols-2 gap-[var(--home-chip-gap)]"
            >
              {welcomeGateOpen ? (
                <>
              <Link href="/gagner-maintenant" className={shortcutClass}>
                {m.menu.gagnerMaintenant}
              </Link>
              <Link href="/vos-idees/#form" className={shortcutClass}>
                {m.nav.vosIdees}
              </Link>
              <ShareHomeButton />
              <Link
                href={hrefWithLang(PARTNER_REGISTER_HREF, locale, source)}
                data-home-inscrire
                className={shortcutClass}
              >
                {m.register.cta}
              </Link>
                </>
              ) : null}
            </nav>
          </div>
          <NeighborhoodNews onNewsChange={onNewsChange} />
          <div className="flex shrink-0 flex-col pt-[var(--home-news-chat-gap)]">
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
      className={shortcutClass}
      onClick={() => void shareApp()}
    >
      {m.shareOpc.short}
    </button>
  );
}

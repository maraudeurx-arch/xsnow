"use client";

/**
 * Mur d'installation obligatoire d'OPC (Popol, 09/11/2026). Rendu PAR DÉFAUT
 * — le reste de l'app n'est même pas monté derrière (aucun son, aucun appel) —
 * (y compris dans l'export statique), retiré seulement quand l'app s'ouvre en
 * mode installé (standalone). Le bouton « Installer » n'apparaît que si le
 * navigateur offre l'installation (beforeinstallprompt) : il lance la vraie
 * installation, jamais un contournement.
 */

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n";
import {
  inAppBrowser,
  installPlatform,
  INSTALL_WALL_VIDEO_URL,
  isStandaloneDisplay,
  shouldShowInstallWall,
  type InstallPlatform,
} from "@/lib/install-wall";

type DeferredPrompt = Event & { prompt: () => Promise<void> };

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const mm = (q: string) => {
    try {
      return window.matchMedia?.(q).matches === true;
    } catch {
      return false;
    }
  };
  return isStandaloneDisplay({
    navigatorStandalone: nav.standalone,
    displayModeStandalone: mm("(display-mode: standalone)"),
    displayModeFullscreen: mm("(display-mode: fullscreen)"),
  });
}

export function InstallWall({ children }: { children: ReactNode }) {
  const { m, locale, setLocale } = useI18n();
  const t = m.installWall;
  const [show, setShow] = useState(true);
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [inApp, setInApp] = useState(false);
  const [deferred, setDeferred] = useState<DeferredPrompt | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- boot sync with the real display mode
    setPlatform(installPlatform(ua));
    setInApp(inAppBrowser(ua));
    const decide = () => setShow(shouldShowInstallWall({ standalone: detectStandalone(), pathname: window.location.pathname }));
    decide();
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as DeferredPrompt);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("popstate", decide);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("popstate", decide);
    };
  }, []);

  if (!show) return <>{children}</>;

  const iosFirst = platform !== "android";
  const ios = (
    <section className="rounded-2xl border border-slate-200 bg-white p-3" data-install-guide="ios" key="ios">
      <h2 className="text-[15px] font-extrabold text-slate-900">{t.iosTitle}</h2>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-[14px] leading-snug text-slate-800">
        {t.iosSteps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </section>
  );
  const android = (
    <section className="rounded-2xl border border-slate-200 bg-white p-3" data-install-guide="android" key="android">
      <h2 className="text-[15px] font-extrabold text-slate-900">{t.androidTitle}</h2>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-[14px] leading-snug text-slate-800">
        {t.androidSteps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </section>
  );

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-wall-title"
        className="fixed inset-0 z-[10000] overflow-y-auto bg-slate-50 px-4 py-6"
        data-install-wall
      >
        <div className="mx-auto grid max-w-md gap-3 text-left">
          <div className="flex justify-end gap-1" aria-label="Langue / Language / Idioma">
            {(["fr", "en", "es"] as Locale[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${locale === l ? "bg-slate-900 text-white" : "bg-white text-slate-800 border border-slate-300"}`}
                data-install-lang={l}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/app-icon-192.png" alt="Open Community" width={72} height={72} className="mx-auto rounded-2xl" />
          <h1 id="install-wall-title" className="text-center text-[20px] font-extrabold leading-tight text-slate-900">
            📲 {t.title}
          </h1>
          <p className="text-[14px] leading-snug text-slate-700">{t.lead}</p>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3 text-center" data-install-video>
            {INSTALL_WALL_VIDEO_URL ? (
              <video controls playsInline src={INSTALL_WALL_VIDEO_URL} className="w-full rounded-xl" />
            ) : (
              <p className="text-[13px] font-bold text-slate-600">🎬 {t.videoPlaceholder}</p>
            )}
          </div>
          {inApp ? (
            <p className="rounded-xl bg-amber-50 p-2 text-[13px] font-bold text-amber-900" data-install-inapp>
              {t.inAppNote}
            </p>
          ) : null}
          {deferred ? (
            <button
              type="button"
              className="tap min-h-12 rounded-2xl bg-slate-900 px-4 text-[15px] font-extrabold text-white"
              onClick={() => void deferred.prompt().catch(() => {})}
              data-install-button
            >
              {t.installButton}
            </button>
          ) : null}
          {iosFirst ? [ios, android] : [android, ios]}
          <p className="text-[13px] leading-snug text-slate-700">{t.then}</p>
          <p className="text-center text-[12px] text-slate-600">
            <Link href="/conditions/" className="underline">{t.terms}</Link>
            {" · "}
            <Link href="/vie-privee/" className="underline">{t.privacy}</Link>
          </p>
        </div>
      </div>
    </>
  );
}

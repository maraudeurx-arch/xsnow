"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ACCUEIL_MENU, ACCUEIL_OPEN_SPEECH, LEFT_MENU } from "@/lib/content";
import { SERVICE_LIST } from "@/lib/services";
import { useSpeech } from "@/lib/speech";

const itemClass = (active: boolean, speaking: boolean) =>
  `tap flex items-center rounded-2xl border px-3 py-2 text-left text-[13px] leading-snug font-semibold ${
    active
      ? "border-gold/70 bg-gold/15 text-gold"
      : "border-white/10 bg-white/5 text-snow/90 hover:border-ice/40 hover:bg-white/10"
  } ${speaking ? "menu-pulse" : ""}`;

export function AccueilMenu() {
  const pathname = usePathname();
  const { isSpeaking, speak } = useSpeech();
  const [open, setOpen] = useState(false);

  return (
    <div className="w-[min(100%,17.5rem)]">
      <button
        type="button"
        className={`inline-flex min-h-[22px] items-center justify-between gap-2 rounded-xl border border-ice/40 bg-white/10 px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-snow backdrop-blur-md ${
          isSpeaking ? "menu-pulse" : ""
        }`}
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) speak(ACCUEIL_OPEN_SPEECH);
        }}
      >
        <span>Accueil</span>
        <span aria-hidden className="text-[10px] font-bold">
          {open ? "–" : "+"}
        </span>
      </button>

      {open ? (
        <nav
          aria-label="Propositions Accueil"
          className="mt-2 max-h-[min(70dvh,34rem)] space-y-3 overflow-y-auto pr-1"
        >
          <Group title="Communauté">
            {LEFT_MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => speak(item.speech)}
                className={itemClass(pathname === item.href, isSpeaking)}
              >
                {item.label}
              </Link>
            ))}
          </Group>
          <Group title="Découvrir">
            {ACCUEIL_MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => speak(item.speech)}
                className={itemClass(pathname === item.href, isSpeaking)}
              >
                {item.label}
              </Link>
            ))}
          </Group>
          <Group title="Services">
            {SERVICE_LIST.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => speak(item.speech)}
                className={itemClass(pathname === item.href, isSpeaking)}
              >
                {item.title}
              </Link>
            ))}
          </Group>
        </nav>
      ) : null}
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 px-1 text-[11px] font-extrabold tracking-[0.16em] text-gold uppercase">
        {title}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

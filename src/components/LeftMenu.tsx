"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEFT_MENU } from "@/lib/content";
import { useSpeech } from "@/lib/speech";

export function LeftMenu() {
  const pathname = usePathname();
  const { isSpeaking, speak } = useSpeech();

  return (
    <nav aria-label="Menu Xsnow" className="mt-3 flex w-[min(100%,17.5rem)] flex-col gap-2">
      {LEFT_MENU.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => speak(item.speech)}
            className={`tap flex items-center rounded-2xl border px-3 py-2 text-left text-[13px] leading-snug font-semibold transition ${
              active
                ? "border-gold/70 bg-gold/15 text-gold"
                : "border-white/10 bg-white/5 text-snow/90 hover:border-ice/40 hover:bg-white/10"
            } ${isSpeaking ? "menu-pulse" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

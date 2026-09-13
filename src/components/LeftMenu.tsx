"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LEFT_MENU } from "@/lib/content";
import { SERVICE_LIST } from "@/lib/services";
import { useSpeech } from "@/lib/speech";

const itemClass = (active: boolean, speaking: boolean) =>
  `tap flex items-center rounded-2xl border px-3 py-2 text-left text-[13px] leading-snug font-semibold transition ${
    active
      ? "border-gold/70 bg-gold/15 text-gold"
      : "border-white/10 bg-white/5 text-snow/90 hover:border-ice/40 hover:bg-white/10"
  } ${speaking ? "menu-pulse" : ""}`;

export function LeftMenu() {
  const pathname = usePathname();
  const { isSpeaking, speak } = useSpeech();
  const onServices = pathname.startsWith("/services");
  const [servicesOpen, setServicesOpen] = useState(onServices);

  return (
    <nav aria-label="Menu Xsnow" className="mt-3 flex w-[min(100%,17.5rem)] flex-col gap-2">
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

      <button
        type="button"
        aria-expanded={servicesOpen}
        onClick={() => {
          const next = !servicesOpen;
          setServicesOpen(next);
          speak(
            next
              ? "Services Open-Community. Courses et livraison, aide au déménagement, garde d’enfants et d’animaux, et prêt d’objets avec caution."
              : "Menu Services refermé.",
          );
        }}
        className={`tap mt-1 flex items-center justify-between rounded-2xl border px-3 text-left text-[13px] font-extrabold tracking-wide ${
          onServices
            ? "border-gold/70 bg-gold/15 text-gold"
            : "border-white/15 bg-white/5 text-gold"
        } ${isSpeaking ? "menu-pulse" : ""}`}
      >
        <span>Services</span>
        <span aria-hidden className="text-xs font-bold">
          {servicesOpen ? "–" : "+"}
        </span>
      </button>

      {servicesOpen
        ? SERVICE_LIST.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => speak(item.speech)}
              className={itemClass(pathname === item.href, isSpeaking)}
            >
              {item.title}
            </Link>
          ))
        : null}
    </nav>
  );
}

"use client";

import { PAID_MISSION_LINKS } from "@/lib/paid-missions";

const ctaClass =
  "tap inline-flex min-h-11 w-full items-center justify-center rounded-full border border-gold/65 bg-cobalt px-3 text-center text-sm font-extrabold text-snow";

export function EarnNowBoard() {
  return (
    <div className="grid gap-2">
      {PAID_MISSION_LINKS.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={ctaClass}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

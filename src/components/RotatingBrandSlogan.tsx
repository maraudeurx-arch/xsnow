"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";

/**
 * Header gold slogans rotate one-at-a-time inside the existing centered
 * slogan line (same footprint as the old static « Monétisez-vous ! »).
 */
export function RotatingBrandSlogan() {
  const { m } = useI18n();
  const slogans = m.brand.slogans;
  const list = slogans.length ? slogans : [m.brand.slogan];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (list.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [list.length]);

  return (
    <span className="brand-slogan-viewport" aria-live="polite" aria-label={list.join(" · ")}>
      <span
        className="brand-slogan-track"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {list.map((text, i) => (
          <span
            key={`${i}-${text}`}
            className="brand-slogan-slide"
            aria-hidden={i === index ? undefined : true}
          >
            {text}
          </span>
        ))}
      </span>
    </span>
  );
}

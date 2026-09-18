"use client";

import { useI18n } from "@/lib/i18n/locale";

/**
 * Header gold slogans: Monétisé Vous! + companions slide right → left
 * in the same session (same marquee pattern as the footer).
 */
export function RotatingBrandSlogan() {
  const { m } = useI18n();
  const slogans = m.brand.slogans;
  const list = slogans.length ? slogans : [m.brand.slogan];
  const label = list.join(" · ");
  const sequence = [...list, ...list];

  return (
    <span className="footer-slogan-marquee" aria-label={label}>
      <span className="footer-slogan-track">
        {sequence.map((text, index) => (
          <span
            key={`${index}-${text}`}
            className="footer-slogan-item"
            aria-hidden={index >= list.length ? true : undefined}
          >
            {text}
          </span>
        ))}
      </span>
    </span>
  );
}

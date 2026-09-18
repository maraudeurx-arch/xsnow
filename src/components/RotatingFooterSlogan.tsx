"use client";

import { useI18n } from "@/lib/i18n/locale";

/**
 * Footer taglines: all slogans slide right → left in the same session
 * (no longer one slogan per reopen).
 */
export function RotatingFooterSlogan() {
  const { m } = useI18n();
  const slogans = m.footer.slogans;
  const list = slogans.length ? slogans : [m.footer.before];
  const label = list.join(" · ");

  // Two identical sequences so the CSS -50% loop is seamless.
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

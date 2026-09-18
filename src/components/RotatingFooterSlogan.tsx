"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { pickSloganForSession } from "@/lib/rotating-slogan";

/** Footer tagline that advances once per app reopen; slides right → left. */
export function RotatingFooterSlogan() {
  const { m } = useI18n();
  const slogans = m.footer.slogans;
  const fallback = slogans[0] ?? m.footer.before;
  const [text, setText] = useState(fallback);

  useEffect(() => {
    setText(
      pickSloganForSession(slogans, {
        local: window.localStorage,
        session: window.sessionStorage,
      }),
    );
  }, [slogans]);

  return (
    <span className="footer-slogan-marquee" aria-label={text}>
      <span className="footer-slogan-track">
        <span className="footer-slogan-item">{text}</span>
        <span className="footer-slogan-item" aria-hidden="true">
          {text}
        </span>
      </span>
    </span>
  );
}

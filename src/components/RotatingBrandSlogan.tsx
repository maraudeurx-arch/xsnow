"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { pickSloganForSession } from "@/lib/rotating-slogan";

/** Banner tagline that advances once per app reopen. */
export function RotatingBrandSlogan() {
  const { m } = useI18n();
  const slogans = m.brand.slogans;
  const fallback = slogans[0] ?? "";
  const [text, setText] = useState(fallback);

  useEffect(() => {
    setText(
      pickSloganForSession(slogans, {
        local: window.localStorage,
        session: window.sessionStorage,
      }),
    );
  }, [slogans]);

  return <>{text}</>;
}

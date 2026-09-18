"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { pickSloganForSession } from "@/lib/rotating-slogan";

/** Footer tagline that advances once per app reopen. */
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

  return <>{text}</>;
}

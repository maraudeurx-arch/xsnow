/** Rotate footer taglines once per app reopen (new browser session). */

export const SLOGAN_SESSION_KEY = "xsnow.footerSloganSessionIndex";
export const SLOGAN_INDEX_KEY = "xsnow.footerSloganIndex";

function safeStorage(store?: Storage): Storage | undefined {
  if (store) return store;
  return undefined;
}

/**
 * Pick the slogan for this app session. First mount of a new session advances
 * the durable index so the next reopen shows the next tagline.
 */
export function pickSloganForSession(
  slogans: readonly string[],
  opts?: { local?: Storage; session?: Storage },
): string {
  if (!slogans.length) return "";
  const local = safeStorage(opts?.local);
  const session = safeStorage(opts?.session);

  const sessionRaw = session?.getItem(SLOGAN_SESSION_KEY);
  if (sessionRaw != null && sessionRaw !== "") {
    const sessionIndex = Number(sessionRaw);
    if (Number.isFinite(sessionIndex) && sessionIndex >= 0) {
      return slogans[sessionIndex % slogans.length]!;
    }
  }

  let index = Number(local?.getItem(SLOGAN_INDEX_KEY) ?? "0");
  if (!Number.isFinite(index) || index < 0) index = 0;
  const pickIndex = index % slogans.length;
  const nextIndex = (pickIndex + 1) % slogans.length;
  try {
    session?.setItem(SLOGAN_SESSION_KEY, String(pickIndex));
    local?.setItem(SLOGAN_INDEX_KEY, String(nextIndex));
  } catch {
    /* private mode */
  }
  return slogans[pickIndex]!;
}

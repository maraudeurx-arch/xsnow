/** Welcome plays as soon as an avatar is chosen. Geo is asked after speech. */
export function welcomeSpeechReady(opts: { hasAvatar: boolean }): boolean {
  return opts.hasAvatar;
}

/** If the speech engine never starts, open geo shortly after the speak intent. */
export const WELCOME_AUTOPLAY_GRACE_MS = 1200;

/**
 * Prefer opening geolocation after welcome ends.
 * If autoplay is blocked (no engine start), open after a short grace period.
 * Never opens before the speak intent has been made.
 */
export function welcomeGateShouldOpen(opts: {
  engineStarted: boolean;
  engineEnded: boolean;
  msSinceSpeakIntent: number;
  autoplayGraceMs?: number;
}): boolean {
  if (opts.engineEnded) return true;
  const grace = opts.autoplayGraceMs ?? WELCOME_AUTOPLAY_GRACE_MS;
  return !opts.engineStarted && opts.msSinceSpeakIntent >= grace;
}

/** First-visit geo/analytics sheet waits for avatar + welcome intent. */
export function canShowConsentSheet(opts: {
  hasAvatar: boolean;
  welcomeGateOpen: boolean;
}): boolean {
  return opts.hasAvatar && opts.welcomeGateOpen;
}

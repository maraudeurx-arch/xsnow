export const SEASONS = ["winter", "spring", "summer", "autumn"] as const;

export type Season = (typeof SEASONS)[number];

export const SEASON_TIME_ZONE = "America/Toronto";

export function parseSeasonParam(raw: string | null | undefined): Season | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  return (SEASONS as readonly string[]).includes(value) ? (value as Season) : null;
}

export function seasonFromMonth(month: number): Season {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

/** Calendar season from a date in America/Toronto (or another IANA zone). */
export function seasonFromDate(
  date: Date = new Date(),
  timeZone = SEASON_TIME_ZONE,
): Season {
  const month = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone, month: "numeric" }).format(date),
  );
  return seasonFromMonth(month);
}

export type SeasonParticle = {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  drift: number;
  blur: number;
  rotate: number;
  variant: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function between(rng: () => number, min: number, max: number) {
  return min + rng() * (max - min);
}

function makeParticles(
  count: number,
  seed: number,
  configure: (rng: () => number, index: number) => Omit<SeasonParticle, "id">,
): SeasonParticle[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    ...configure(rng, index),
  }));
}

function winterParticles() {
  return makeParticles(180, 20261221, (rng) => {
    const large = rng() < 0.28;
    return {
      left: between(rng, 0.2, 99.6),
      top: between(rng, -22, 6),
      size: large ? between(rng, 5.5, 12) : between(rng, 2.2, 5.8),
      delay: between(rng, -24, 6),
      duration: large ? between(rng, 14, 24) : between(rng, 7.5, 16),
      opacity: large ? between(rng, 0.42, 0.95) : between(rng, 0.28, 0.78),
      drift: between(rng, -48, 54),
      blur: rng() < 0.2 ? between(rng, 0.3, 1.4) : 0,
      rotate: 0,
      variant: Math.floor(between(rng, 0, 4)),
    };
  });
}

function springParticles() {
  return makeParticles(52, 20260321, (rng) => ({
    left: between(rng, 0.5, 99),
    top: between(rng, -16, 4),
    size: between(rng, 7, 16),
    delay: between(rng, -18, 6),
    duration: between(rng, 11, 24),
    opacity: between(rng, 0.28, 0.82),
    drift: between(rng, -56, 62),
    blur: rng() < 0.15 ? 0.6 : 0,
    rotate: between(rng, -40, 50),
    variant: Math.floor(between(rng, 0, 4)),
  }));
}

function summerParticles() {
  return makeParticles(42, 20260621, (rng) => ({
    left: between(rng, 2, 97),
    top: between(rng, 8, 88),
    size: between(rng, 2.2, 5.5),
    delay: between(rng, -10, 8),
    duration: between(rng, 6.5, 14),
    opacity: between(rng, 0.2, 0.95),
    drift: between(rng, -28, 36),
    blur: between(rng, 0.4, 2.2),
    rotate: 0,
    variant: Math.floor(between(rng, 0, 3)),
  }));
}

function autumnParticles() {
  return makeParticles(46, 20260922, (rng) => ({
    left: between(rng, 0.6, 99),
    top: between(rng, -18, 6),
    size: between(rng, 16, 34),
    delay: between(rng, -20, 7),
    duration: between(rng, 10, 21),
    opacity: between(rng, 0.35, 0.92),
    drift: between(rng, -70, 74),
    blur: rng() < 0.12 ? 0.5 : 0,
    rotate: between(rng, -30, 40),
    variant: Math.floor(between(rng, 0, 5)),
  }));
}

const PARTICLES: Record<Season, SeasonParticle[]> = {
  winter: winterParticles(),
  spring: springParticles(),
  summer: summerParticles(),
  autumn: autumnParticles(),
};

export function seasonParticles(season: Season): SeasonParticle[] {
  return PARTICLES[season];
}

export const SEASON_PHOTO: Record<Season, string> = {
  winter: "/seasons/winter.png",
  spring: "/seasons/spring.png",
  summer: "/seasons/summer.png",
  autumn: "/seasons/autumn.png",
};

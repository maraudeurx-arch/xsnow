"use client";

import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { parseSeasonParam, seasonFromDate, seasonParticles, type Season, type SeasonParticle } from "@/lib/season";

const PETAL_COLORS = ["#ffb7c5", "#fff6f8", "#e9d5ff", "#a7f3d0"];
const LEAF_COLORS = ["#f59e0b", "#d97706", "#b45309", "#9f1239", "#7f1d1d"];
const FLAKE_COLORS = [
  "rgba(244,246,251,1)",
  "rgba(186,230,253,1)",
  "rgba(61,255,138,0.95)",
  "rgba(196,181,253,1)",
];

function MapleLeaf() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <path
        fill="currentColor"
        d="M12 2.1c.3 2 1.3 3.6 1.3 3.6S16 4.8 18.6 6.1c-1.7 1.1-2.5 2.3-2.5 2.3S19.2 9.3 21.2 11.4c-2.3.3-3.7.5-3.7.5s1.4 1.5 1.8 3.5c-2.2-.1-3.6-.7-3.6-.7s.4 2.1 0 4.1c-1.3-.9-2.3-1.7-2.3-1.7L12 21.8l-1.4-4.7s-1 .8-2.3 1.7c-.4-2 0-4.1 0-4.1s-1.4.6-3.6.7c.4-2 1.8-3.5 1.8-3.5s-1.4-.2-3.7-.5C4.8 9.3 7.9 8.4 7.9 8.4S7.1 7.2 5.4 6.1C8 4.8 10.7 5.7 10.7 5.7S11.7 4.1 12 2.1z"
      />
    </svg>
  );
}

function particleStyle(particle: SeasonParticle, extra?: CSSProperties): CSSProperties {
  return {
    left: `${particle.left}%`,
    top: `${particle.top}%`,
    width: particle.size,
    height: particle.size,
    animationDelay: `${particle.delay}s`,
    animationDuration: `${particle.duration}s`,
    opacity: particle.opacity,
    filter: particle.blur ? `blur(${particle.blur}px)` : undefined,
    ["--alpha" as string]: String(particle.opacity),
    ["--drift" as string]: `${particle.drift}px`,
    ["--spin" as string]: `${particle.rotate}deg`,
    ...extra,
  };
}

function WinterField({ particles }: { particles: SeasonParticle[] }) {
  return (
    <>
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="season-flake"
          style={particleStyle(particle, {
            background: FLAKE_COLORS[particle.variant % FLAKE_COLORS.length],
            boxShadow: `0 0 ${Math.max(4, particle.size * 1.4)}px ${FLAKE_COLORS[particle.variant % FLAKE_COLORS.length]}`,
          })}
        />
      ))}
    </>
  );
}

function SpringField({ particles }: { particles: SeasonParticle[] }) {
  return (
    <>
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="season-petal"
          style={particleStyle(particle, {
            background: PETAL_COLORS[particle.variant % PETAL_COLORS.length],
          })}
        />
      ))}
    </>
  );
}

function SummerField({ particles }: { particles: SeasonParticle[] }) {
  return (
    <>
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="season-firefly"
          style={particleStyle(particle, {
            background:
              particle.variant === 0
                ? "rgba(250,204,21,0.95)"
                : particle.variant === 1
                  ? "rgba(61,255,138,0.9)"
                  : "rgba(254,240,138,0.95)",
          })}
        />
      ))}
    </>
  );
}

function AutumnField({ particles }: { particles: SeasonParticle[] }) {
  return (
    <>
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="season-leaf"
          style={particleStyle(particle, {
            color: LEAF_COLORS[particle.variant % LEAF_COLORS.length],
          })}
        >
          <MapleLeaf />
        </span>
      ))}
    </>
  );
}

function Field({ season }: { season: Season }) {
  const particles = seasonParticles(season);
  if (season === "winter") return <WinterField particles={particles} />;
  if (season === "spring") return <SpringField particles={particles} />;
  if (season === "summer") return <SummerField particles={particles} />;
  return <AutumnField particles={particles} />;
}

export function SeasonalBackdrop() {
  const params = useSearchParams();
  const season = parseSeasonParam(params.get("season")) ?? seasonFromDate();

  return (
    <div aria-hidden data-season={season} className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="season-wash" data-season={season} />
      <div className="absolute inset-0">
        <Field season={season} />
      </div>
    </div>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { assetUrl } from "@/lib/paths";
import {
  parseSeasonParam,
  seasonFromDate,
  seasonParticles,
  SEASON_PHOTO,
  type Season,
  type SeasonParticle,
} from "@/lib/season";

const PETAL_COLORS = ["#ffb7c5", "#fff6f8", "#fbcfe8", "#f9a8d4"];
const LEAF_COLORS = ["#f59e0b", "#fbbf24", "#ea580c", "#b45309", "#9f1239"];
const FLAKE_COLORS = ["#ffffff", "#f8fafc", "#e0f2fe", "#fffbeb"];

function MapleLeaf() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-full w-full">
      <path
        fill="currentColor"
        d="M12 1.4l1.1 3.4 2.4-2.1-.2 3.6 3.4-.7-1.6 3.2 3.3 1.4-2.7 2.1 2.4 2.8-3.4.3.3 3.4-3-1.6L12 22l-1.6-4.8-3 1.6.3-3.4-3.4-.3 2.4-2.8-2.7-2.1 3.3-1.4-1.6-3.2 3.4.7-.2-3.6 2.4 2.1z"
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
            boxShadow: `0 0 ${Math.max(5, particle.size * 1.6)}px rgba(255,255,255,0.85)`,
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
                ? "rgba(254,240,138,0.95)"
                : particle.variant === 1
                  ? "rgba(253,224,71,0.95)"
                  : "rgba(255,255,255,0.9)",
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

export function SeasonScene({ season, children }: { season: Season; children?: ReactNode }) {
  return (
    <div aria-hidden data-season={season} className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="season-wash" data-season={season} />
      {/* Plain img: next/image omitted basePath and 404'd on GitHub Pages. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetUrl(SEASON_PHOTO[season])}
        alt=""
        width={1024}
        height={1820}
        decoding="async"
        draggable={false}
        className="season-photo"
      />
      <div className="season-sun" data-season={season} />
      <div className="season-scrim" data-season={season} />
      {children}
    </div>
  );
}

export function SeasonalBackdrop() {
  const params = useSearchParams();
  const season = parseSeasonParam(params.get("season")) ?? seasonFromDate();

  return (
    <SeasonScene season={season}>
      <div className="absolute inset-0">
        <Field season={season} />
      </div>
    </SeasonScene>
  );
}

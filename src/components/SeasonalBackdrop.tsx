"use client";

import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { assetUrl } from "@/lib/paths";
import { usePlace } from "@/lib/place";
import {
  ambianceAttr,
  ambianceKey,
  parseRegionParam,
  photoForAmbiance,
  resolveAmbiance,
  type ResolvedAmbiance,
} from "@/lib/region";
import {
  parseSeasonParam,
  seasonParticles,
  type Season,
  type SeasonParticle,
} from "@/lib/season";

const PETAL_COLORS = ["#ffb7c5", "#fff6f8", "#fbcfe8", "#f9a8d4"];
const LEAF_COLORS = ["#f59e0b", "#fbbf24", "#ea580c", "#b45309", "#9f1239"];
const FLAKE_COLORS = ["#ffffff", "#f8fafc", "#e0f2fe", "#fffbeb"];
const FADE_MS = 560;

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

function BackdropPhoto({
  jpeg,
  webp,
  onLoad,
  fetchPriority = "auto",
}: {
  jpeg: string;
  webp?: string;
  onLoad?: () => void;
  fetchPriority?: "high" | "low" | "auto";
}) {
  const loadedFor = useRef<string | null>(null);
  const token = `${jpeg}|${webp ?? ""}`;

  const markLoaded = () => {
    if (loadedFor.current === token) return;
    loadedFor.current = token;
    onLoad?.();
  };

  const img = (
    // Plain img: next/image omitted basePath and 404'd on GitHub Pages.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetUrl(jpeg)}
      alt=""
      width={1280}
      height={720}
      decoding="async"
      draggable={false}
      fetchPriority={fetchPriority}
      className="season-photo"
      onLoad={markLoaded}
      ref={(el) => {
        if (el && el.complete && el.naturalWidth > 0) markLoaded();
      }}
    />
  );

  if (!webp) return img;
  return (
    <picture className="season-photo-frame">
      <source type="image/webp" srcSet={assetUrl(webp)} />
      {img}
    </picture>
  );
}

export function SeasonScene({
  season,
  ambiance,
  children,
  className,
  onPhotoLoad,
  fetchPriority = "auto",
}: {
  season?: Season;
  ambiance?: ResolvedAmbiance;
  children?: ReactNode;
  className?: string;
  onPhotoLoad?: () => void;
  fetchPriority?: "high" | "low" | "auto";
}) {
  const resolved = ambiance ?? { type: "season" as const, season: season ?? "autumn" };
  const photo = photoForAmbiance(resolved);
  const attr = ambianceAttr(resolved);
  const seasonAttr = resolved.type === "season" ? resolved.season : undefined;

  return (
    <div
      aria-hidden
      data-ambiance={attr}
      data-season={seasonAttr}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`.trim()}
    >
      <div className="season-wash" data-ambiance={attr} data-season={seasonAttr} />
      <BackdropPhoto
        jpeg={photo.jpeg}
        webp={photo.webp}
        onLoad={onPhotoLoad}
        fetchPriority={fetchPriority}
      />
      <div className="season-sun" data-ambiance={attr} data-season={seasonAttr} />
      <div className="season-scrim" data-ambiance={attr} data-season={seasonAttr} />
      {children}
    </div>
  );
}

function AmbianceStack({ target }: { target: ResolvedAmbiance }) {
  const targetKey = ambianceKey(target);
  const [displayed, setDisplayed] = useState<ResolvedAmbiance>(target);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const displayedKey = ambianceKey(displayed);
  const incoming = targetKey === displayedKey ? null : target;
  const incomingReady = Boolean(incoming) && readyKey === targetKey;

  useEffect(() => {
    if (!incoming || !incomingReady) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 0 : FADE_MS;
    const next = incoming;
    const id = window.setTimeout(() => {
      setDisplayed(next);
    }, ms);
    return () => window.clearTimeout(id);
  }, [incoming, incomingReady]);

  return (
    <>
      <SeasonScene ambiance={displayed} fetchPriority="high">
        {displayed.type === "season" ? (
          <div className="absolute inset-0">
            <Field season={displayed.season} />
          </div>
        ) : null}
      </SeasonScene>
      {incoming ? (
        <SeasonScene
          key={targetKey}
          ambiance={incoming}
          className={incomingReady ? "ambiance-layer is-visible" : "ambiance-layer"}
          fetchPriority="low"
          onPhotoLoad={() => setReadyKey(targetKey)}
        />
      ) : null}
    </>
  );
}

export function SeasonalBackdrop() {
  const params = useSearchParams();
  const { countryCode } = usePlace();
  const seasonOverride = parseSeasonParam(params.get("season"));
  const regionOverride = parseRegionParam(params.get("region"));
  const target = useMemo(
    () =>
      resolveAmbiance({
        countryCode,
        seasonOverride,
        regionOverride,
      }),
    [countryCode, seasonOverride, regionOverride],
  );

  return <AmbianceStack target={target} />;
}

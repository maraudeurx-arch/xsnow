"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { assetUrl } from "@/lib/paths";
import { AVATAR_RINGS, type Avatar } from "@/lib/avatars";

export function AvatarDisc({
  avatar,
  className,
  selected = false,
  priority = false,
}: {
  avatar: Avatar;
  className: string;
  selected?: boolean;
  priority?: boolean;
}) {
  const { m } = useI18n();
  const ring = AVATAR_RINGS[avatar.ring];
  return (
    <span
      className={`avatar-disc ${className} ${selected ? "is-selected" : ""}`}
      style={{ "--avatar-ring": ring } as CSSProperties}
    >
      <span className="block h-full w-full overflow-hidden rounded-full">
        {/* Plain img: next/image omitted basePath and 404'd on GitHub Pages. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assetUrl(avatar.src)}
          alt={m.guide.alts[avatar.id]}
          width={720}
          height={720}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="h-full w-full rounded-full object-cover object-center"
        />
      </span>
    </span>
  );
}

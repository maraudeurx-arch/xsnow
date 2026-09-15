"use client";

import { useI18n } from "@/lib/i18n/locale";
import { assetUrl } from "@/lib/paths";
import type { Avatar } from "@/lib/avatars";

const frameClass =
  "block rounded-full border-[3px] border-gold shadow-[0_0_14px_rgba(61,255,138,0.35)] ring-[2.5px] ring-gold ring-offset-[3px] ring-offset-[#050506]";

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
  return (
    <span
      className={`${frameClass} ${className} ${
        selected ? "shadow-[0_0_22px_rgba(61,255,138,0.7)] ring-[3.5px]" : ""
      }`}
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

"use client";

import { assetUrl } from "@/lib/paths";
import type { Avatar } from "@/lib/avatars";

const frameClass =
  "block rounded-full border-[2.5px] border-snow shadow-[0_8px_20px_rgba(0,0,0,0.45)] ring-[2.5px] ring-offset-[3px] ring-offset-[#050506]";

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
  return (
    <span
      className={`${frameClass} ${className} ${
        selected ? "ring-gold" : "ring-snow"
      }`}
    >
      <span className="block h-full w-full overflow-hidden rounded-full">
        {/* Plain img: next/image omitted basePath and 404'd on GitHub Pages. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assetUrl(avatar.src)}
          alt={avatar.alt}
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

"use client";

import Link from "next/link";
import { AvatarDisc } from "@/components/AvatarDisc";
import { PlaceWordmark } from "@/components/PlaceWordmark";
import { avatarById } from "@/lib/avatars";
import { useStoredAvatar } from "@/lib/useStoredAvatar";

/** City wordmark with the chosen avatar beside it — frees Accueil ad space. */
export function HeaderPlaceWithAvatar() {
  const [avatarId] = useStoredAvatar();
  const chosen = avatarId ? avatarById(avatarId) : null;

  return (
    <Link
      href="/"
      className="inline-flex min-w-0 items-center gap-1.5 text-[1.02rem] leading-none font-black tracking-tight text-gold [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:gap-2 sm:text-[1.45rem]"
      data-header-place-avatar
    >
      {chosen ? (
        <AvatarDisc
          avatar={chosen}
          className="size-8 shrink-0 sm:size-9"
          priority
        />
      ) : null}
      <PlaceWordmark />
    </Link>
  );
}

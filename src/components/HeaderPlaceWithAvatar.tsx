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
      className="inline-flex min-w-0 items-center gap-1.5 text-base leading-none font-black tracking-tight text-gold sm:gap-2 sm:text-xl"
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

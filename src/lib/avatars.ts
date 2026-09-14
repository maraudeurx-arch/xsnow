export const AVATAR_STORAGE_KEY = "xsnow.avatar";

export type VoiceGender = "male" | "female";

export const AVATARS = [
  {
    id: "homme-blanc",
    src: "/avatars/homme-blanc.png",
    label: "Homme, peau claire",
    alt: "Avatar d’un homme à la peau claire, cheveux bruns, t-shirt bleu",
    gender: "male",
  },
  {
    id: "femme-blanche",
    src: "/avatars/femme-blanche.png",
    label: "Femme, peau claire",
    alt: "Avatar d’une femme à la peau claire, cheveux châtains, pull beige",
    gender: "female",
  },
  {
    id: "homme-noir",
    src: "/avatars/homme-noir.png",
    label: "Homme, peau foncée",
    alt: "Avatar d’un homme à la peau foncée, lunettes et barbe, veste camel",
    gender: "male",
  },
  {
    id: "femme-noire",
    src: "/avatars/femme-noire.png",
    label: "Femme, peau foncée",
    alt: "Avatar d’une femme à la peau foncée, cheveux bouclés, pull moutarde",
    gender: "female",
  },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];
export type Avatar = (typeof AVATARS)[number];

export function isAvatarId(value: unknown): value is AvatarId {
  return (
    typeof value === "string" && AVATARS.some((avatar) => avatar.id === value)
  );
}

export function avatarById(id: AvatarId): Avatar {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}

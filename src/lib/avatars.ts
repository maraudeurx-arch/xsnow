export const AVATAR_STORAGE_KEY = "xsnow.avatar";

export type VoiceGender = "male" | "female";

/** Distinct picker/selected ring hues: men green+blue, women pink+yellow. */
export const AVATAR_RINGS = {
  green: "#3dff8a",
  blue: "#3db8ff",
  pink: "#ff6bb5",
  yellow: "#ffe14d",
} as const;

export type AvatarRing = keyof typeof AVATAR_RINGS;

export const AVATARS = [
  {
    id: "homme-blanc",
    src: "/avatars/homme-blanc.png",
    label: "Homme, peau claire",
    alt: "Avatar d’un homme à la peau claire, cheveux bruns, t-shirt bleu",
    gender: "male",
    ring: "green",
  },
  {
    id: "femme-blanche",
    src: "/avatars/femme-blanche.png",
    label: "Femme, peau claire",
    alt: "Avatar d’une femme à la peau claire, cheveux châtains, pull beige",
    gender: "female",
    ring: "pink",
  },
  {
    id: "homme-noir",
    src: "/avatars/homme-noir.png",
    label: "Homme, peau foncée",
    alt: "Avatar d’un homme à la peau foncée, lunettes et barbe, veste camel",
    gender: "male",
    ring: "blue",
  },
  {
    id: "femme-noire",
    src: "/avatars/femme-noire.png",
    label: "Femme, peau foncée",
    alt: "Avatar d’une femme à la peau foncée, cheveux bouclés, pull moutarde",
    gender: "female",
    ring: "yellow",
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

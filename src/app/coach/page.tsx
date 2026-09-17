import { AvatarCoach } from "@/components/features/AvatarCoach";
import { LocalizedFeature } from "@/components/LocalizedFeature";

export const metadata = { title: "Coach avatar" };

export default function CoachPage() {
  return (
    <LocalizedFeature feature="coach" compact>
      <AvatarCoach />
    </LocalizedFeature>
  );
}

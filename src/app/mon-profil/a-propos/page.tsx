import { ProfileStub } from "@/components/ProfileStub";
import { BRAND, FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "À propos" };

export default function AProposPage() {
  return (
    <ProfileStub title={FEATURE_COPY.aPropos.title} lead={FEATURE_COPY.aPropos.lead}>
      <p className="text-sm leading-relaxed text-ice/85">
        {BRAND.name} / {BRAND.community} — {BRAND.slogan} Notre proximité et notre esprit d’entraide
        est le gage de notre succès.
      </p>
    </ProfileStub>
  );
}

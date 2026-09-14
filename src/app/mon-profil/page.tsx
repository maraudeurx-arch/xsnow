import { ProfilMenu } from "@/components/ProfilMenu";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Mon profil" };

export default function MonProfilPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.monProfil.title} lead={FEATURE_COPY.monProfil.lead}>
      <ProfilMenu />
    </FeaturePanel>
  );
}

import { ConnectWallet } from "@/components/ConnectWallet";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Mon profil" };

export default function MonProfilPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.monProfil.title} lead={FEATURE_COPY.monProfil.lead}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ice/85">
          Connectez un portefeuille si vous le souhaitez. Ce n’est pas obligatoire pour explorer
          Open Community.
        </p>
        <div className="flex justify-center">
          <ConnectWallet />
        </div>
      </div>
    </FeaturePanel>
  );
}

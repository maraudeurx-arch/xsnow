import { ConnectWallet } from "@/components/ConnectWallet";
import { ProfileStub } from "@/components/ProfileStub";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Mes infos" };

export default function MesInfosPage() {
  return (
    <ProfileStub title={FEATURE_COPY.mesInfos.title} lead={FEATURE_COPY.mesInfos.lead}>
      <p className="text-sm leading-relaxed text-ice/85">
        Nom, quartier et attributs s’afficheront ici. En attendant, vous pouvez connecter un
        portefeuille — ce n’est pas obligatoire.
      </p>
      <div className="flex justify-center">
        <ConnectWallet />
      </div>
    </ProfileStub>
  );
}

import { ProfilMenu } from "@/components/ProfilMenu";
import { LocalizedFeature } from "@/components/LocalizedFeature";

export const metadata = { title: "Mon profil" };

export default function MonProfilPage() {
  return (
    <LocalizedFeature feature="monProfil">
      <ProfilMenu />
    </LocalizedFeature>
  );
}

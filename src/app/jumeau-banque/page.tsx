import { LocalizedFeature } from "@/components/LocalizedFeature";
import { TwinBankBrowser } from "@/components/features/TwinBankBrowser";

export const metadata = { title: "Jumeau numérique — banque d’images et de voix" };

export default function JumeauBanquePage() {
  return (
    <LocalizedFeature feature="jumeauBanque" compact>
      <TwinBankBrowser />
    </LocalizedFeature>
  );
}

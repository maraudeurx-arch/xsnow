import { LocalizedFeature } from "@/components/LocalizedFeature";
import { PersonaDepositBoard } from "@/components/features/PersonaDepositBoard";

export const metadata = { title: "Monétisez-vous : votre image, votre voix." };

export default function MonetisePage() {
  return (
    <LocalizedFeature feature="monetise" compact>
      <PersonaDepositBoard />
    </LocalizedFeature>
  );
}

import { PhoneBoard } from "@/components/features/PhoneBoard";
import { LocalizedFeature } from "@/components/LocalizedFeature";

export const metadata = { title: "Téléphone perdu" };

export default function TelephonePage() {
  return (
    <LocalizedFeature feature="telephone">
      <PhoneBoard />
    </LocalizedFeature>
  );
}

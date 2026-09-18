import { PhoneBoard } from "@/components/features/PhoneBoard";
import { LocalizedFeature } from "@/components/LocalizedFeature";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Téléphone perdu" };

export default function TelephonePage() {
  return (
    <SignupGate>
      <LocalizedFeature feature="telephone">
        <PhoneBoard />
      </LocalizedFeature>
    </SignupGate>
  );
}

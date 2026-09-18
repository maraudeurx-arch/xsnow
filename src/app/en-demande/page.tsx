import { LocalizedFeature } from "@/components/LocalizedFeature";
import { DemandBoard } from "@/components/features/DemandBoard";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "En demande" };

export default function EnDemandePage() {
  return (
    <SignupGate>
      <LocalizedFeature feature="enDemande">
        <DemandBoard />
      </LocalizedFeature>
    </SignupGate>
  );
}

import { ProximityBoard } from "@/components/features/ProximityBoard";
import { LocalizedFeature } from "@/components/LocalizedFeature";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Proximité" };

export default function ProximitePage() {
  return (
    <SignupGate>
      <LocalizedFeature feature="proximite">
        <ProximityBoard />
      </LocalizedFeature>
    </SignupGate>
  );
}

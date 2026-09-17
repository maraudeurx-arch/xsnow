import { LocalizedFeature } from "@/components/LocalizedFeature";
import { EarnNowBoard } from "@/components/features/EarnNowBoard";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Gagner maintenant" };

export default function GagnerMaintenantPage() {
  return (
    <LocalizedFeature feature="gagnerMaintenant" compact>
      <SignupGate>
        <EarnNowBoard />
      </SignupGate>
    </LocalizedFeature>
  );
}

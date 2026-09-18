import { LocalizedFeature } from "@/components/LocalizedFeature";
import { MyServicesBoard } from "@/components/features/MyServicesBoard";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Mes services" };

export default function MesServicesPage() {
  return (
    <SignupGate>
      <LocalizedFeature feature="mesServices">
        <MyServicesBoard />
      </LocalizedFeature>
    </SignupGate>
  );
}

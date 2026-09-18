import { AlertBoard } from "@/components/features/AlertBoard";
import { LocalizedFeature } from "@/components/LocalizedFeature";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Alertes" };

export default function AlertesPage() {
  return (
    <SignupGate>
      <LocalizedFeature feature="alertes">
        <AlertBoard />
      </LocalizedFeature>
    </SignupGate>
  );
}

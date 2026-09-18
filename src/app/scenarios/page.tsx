import { LocalizedStubFeature } from "@/components/LocalizedStub";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Scénarios humour / animé" };

export default function ScenariosPage() {
  return (
    <SignupGate>
      <LocalizedStubFeature feature="scenarios" stub="scenarios" />
    </SignupGate>
  );
}

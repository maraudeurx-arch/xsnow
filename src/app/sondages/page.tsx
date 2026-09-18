import { LocalizedStubFeature } from "@/components/LocalizedStub";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Sondages" };

export default function SondagesPage() {
  return (
    <SignupGate>
      <LocalizedStubFeature feature="sondages" stub="sondages" />
    </SignupGate>
  );
}

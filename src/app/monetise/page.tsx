import { LocalizedStubFeature } from "@/components/LocalizedStub";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Monétisez-vous : votre image, votre voix." };

export default function MonetisePage() {
  return (
    <SignupGate>
      <LocalizedStubFeature feature="monetise" stub="monetise" />
    </SignupGate>
  );
}

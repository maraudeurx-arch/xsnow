import { AttributesBoard } from "@/components/features/AttributesBoard";
import { LocalizedFeature } from "@/components/LocalizedFeature";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Vos attributs" };

export default function AttributsPage() {
  return (
    <SignupGate>
      <LocalizedFeature feature="attributs">
        <AttributesBoard />
      </LocalizedFeature>
    </SignupGate>
  );
}

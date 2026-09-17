import { LocalizedFeature } from "@/components/LocalizedFeature";
import { IdeasBoard } from "@/components/features/IdeasBoard";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Vos idées" };

export default function VosIdeesPage() {
  return (
    <LocalizedFeature feature="vosIdees" compact>
      <SignupGate>
        <IdeasBoard />
      </SignupGate>
    </LocalizedFeature>
  );
}

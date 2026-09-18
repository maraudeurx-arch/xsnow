import { LocalizedCatalog } from "@/components/LocalizedCatalog";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Séries TV" };

export default function SeriesPage() {
  return (
    <SignupGate>
      <LocalizedCatalog feature="series" />
    </SignupGate>
  );
}

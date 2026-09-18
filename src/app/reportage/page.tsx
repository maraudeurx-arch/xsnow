import { LocalizedCatalog } from "@/components/LocalizedCatalog";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Reportages IA" };

export default function ReportagePage() {
  return (
    <SignupGate>
      <LocalizedCatalog feature="reportage" />
    </SignupGate>
  );
}

import { LocalizedCatalog } from "@/components/LocalizedCatalog";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Dessins animés" };

export default function DessinsPage() {
  return (
    <SignupGate>
      <LocalizedCatalog feature="dessins" />
    </SignupGate>
  );
}

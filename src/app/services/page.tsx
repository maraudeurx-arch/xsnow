import { LocalizedServicesList } from "@/components/LocalizedServicesList";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <SignupGate>
      <LocalizedServicesList />
    </SignupGate>
  );
}

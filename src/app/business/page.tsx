import { BusinessBoard } from "@/components/features/BusinessBoard";
import { LocalizedFeature } from "@/components/LocalizedFeature";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Business" };

export default function BusinessPage() {
  return (
    <SignupGate>
      <LocalizedFeature feature="business">
        <BusinessBoard />
      </LocalizedFeature>
    </SignupGate>
  );
}

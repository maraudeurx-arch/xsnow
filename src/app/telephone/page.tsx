import { PhoneBoard } from "@/components/features/PhoneBoard";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Téléphone perdu" };

export default function TelephonePage() {
  return (
    <FeaturePanel title={FEATURE_COPY.telephone.title} lead={FEATURE_COPY.telephone.lead}>
      <PhoneBoard />
    </FeaturePanel>
  );
}

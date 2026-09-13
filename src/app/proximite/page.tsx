import { ProximityBoard } from "@/components/features/ProximityBoard";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Proximité" };

export default function ProximitePage() {
  return (
    <FeaturePanel title={FEATURE_COPY.proximite.title} lead={FEATURE_COPY.proximite.lead}>
      <ProximityBoard />
    </FeaturePanel>
  );
}

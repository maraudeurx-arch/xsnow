import { AttributesBoard } from "@/components/features/AttributesBoard";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Vos attributs" };

export default function AttributsPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.attributs.title} lead={FEATURE_COPY.attributs.lead}>
      <AttributesBoard />
    </FeaturePanel>
  );
}

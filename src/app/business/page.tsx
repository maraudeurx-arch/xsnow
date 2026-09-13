import { BusinessBoard } from "@/components/features/BusinessBoard";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Business" };

export default function BusinessPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.business.title} lead={FEATURE_COPY.business.lead}>
      <BusinessBoard />
    </FeaturePanel>
  );
}

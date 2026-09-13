import { AlertBoard } from "@/components/features/AlertBoard";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Alertes" };

export default function AlertesPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.alertes.title} lead={FEATURE_COPY.alertes.lead}>
      <AlertBoard />
    </FeaturePanel>
  );
}

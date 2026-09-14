import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Scénarios humour / animé" };

export default function ScenariosPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.scenarios.title} lead={FEATURE_COPY.scenarios.lead}>
      <p className="text-sm leading-relaxed text-ice/85">
        Un atelier pour inventer des sketches et des dessins animés communautaires. Prévu pour 2027.
      </p>
    </FeaturePanel>
  );
}

import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Sondages" };

export default function SondagesPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.sondages.title} lead={FEATURE_COPY.sondages.lead}>
      <p className="text-sm leading-relaxed text-ice/85">
        Bientôt : des sondages de quartier, une compensation affichée, et un historique dans{" "}
        <span className="font-extrabold text-gold">Mes services</span>.
      </p>
    </FeaturePanel>
  );
}

import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Service en demande" };

export default function ServiceEnDemandePage() {
  return (
    <FeaturePanel
      title={FEATURE_COPY.serviceEnDemande.title}
      lead={FEATURE_COPY.serviceEnDemande.lead}
    >
      <p className="text-sm leading-relaxed text-ice/85">
        Les demandes du quartier — un coup de main, une course, une garde — apparaîtront ici pour
        que vous puissiez y répondre.
      </p>
    </FeaturePanel>
  );
}

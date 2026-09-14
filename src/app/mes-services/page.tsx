import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Mes services" };

export default function MesServicesPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.mesServices.title} lead={FEATURE_COPY.mesServices.lead}>
      <p className="text-sm leading-relaxed text-ice/85">
        Vos offres (pubs, courses, garde, prêts) s’afficheront ici. Rien n’est encore publié sur
        cet appareil.
      </p>
    </FeaturePanel>
  );
}

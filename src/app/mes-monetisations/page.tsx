import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Mes monétisations" };

export default function MesMonetisationsPage() {
  return (
    <FeaturePanel
      title={FEATURE_COPY.mesMonetisations.title}
      lead={FEATURE_COPY.mesMonetisations.lead}
    >
      <p className="text-sm leading-relaxed text-ice/85">
        Vos offres (pubs, courses, garde, prêts) s’afficheront ici. Rien n’est encore publié sur
        cet appareil.
      </p>
    </FeaturePanel>
  );
}

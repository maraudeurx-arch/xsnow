import { CatalogBoard } from "@/components/features/CatalogBoard";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Reportages IA" };

export default function ReportagePage() {
  return (
    <FeaturePanel title={FEATURE_COPY.reportage.title} lead={FEATURE_COPY.reportage.lead}>
      <CatalogBoard
        items={[
          {
            title: "La ruelle qui s’entraide",
            meta: "Quartier",
            blurb:
              "Quand un voisin perd ses clés, trois portes s’ouvrent. Un reportage IA en cours de montage — prévu pour 2027.",
          },
          {
            title: "Commerces de proximité",
            meta: "Économie locale",
            blurb:
              "Ceux qui restent ouverts tard pour les familles. Un portrait d’Open Community.",
          },
          {
            title: "Garder un œil, sans surveiller",
            meta: "Société",
            blurb:
              "Alertes bienveillantes pour enfants et grands-parents : le débat de la semaine.",
          },
        ]}
      />
    </FeaturePanel>
  );
}

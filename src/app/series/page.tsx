import { CatalogBoard } from "@/components/features/CatalogBoard";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Séries TV" };

export default function SeriesPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.series.title} lead={FEATURE_COPY.series.lead}>
      <CatalogBoard
        items={[
          {
            title: "Rue des Pins",
            meta: "Feuilleton · 8 épisodes",
            blurb: "Un immeuble, six familles, une casserole de trop. Bientôt.",
          },
          {
            title: "Sepolia Café",
            meta: "Comédie",
            blurb: "Un portefeuille crypto, un espresso, trop de voisins curieux.",
          },
          {
            title: "La ronde de nuit",
            meta: "Drame",
            blurb: "Ceux qui marchent le quartier pour que personne ne rentre seul.",
          },
        ]}
      />
    </FeaturePanel>
  );
}

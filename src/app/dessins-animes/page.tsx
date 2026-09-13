import { CatalogBoard } from "@/components/features/CatalogBoard";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Dessins animés" };

export default function DessinsPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.dessins.title} lead={FEATURE_COPY.dessins.lead}>
      <CatalogBoard
        items={[
          {
            title: "Flocon et les voisins",
            meta: "3-6 ans",
            blurb: "Un petit flocon apprend à demander de l’aide — et à en offrir.",
          },
          {
            title: "La trottinette perdue",
            meta: "5-8 ans",
            blurb: "Toute la rue cherche, tout le monde trouve, personne ne se moque.",
          },
          {
            title: "Grand-maman GPS",
            meta: "Famille",
            blurb: "Une grand-mère trop rapide, un village trop petit, beaucoup d’amour.",
          },
        ]}
      />
    </FeaturePanel>
  );
}

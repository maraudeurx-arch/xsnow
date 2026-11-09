import { LocalizedFeature } from "@/components/LocalizedFeature";
import { LeadProjectsBoard } from "@/components/features/LeadProjectsBoard";

export const metadata = { title: "Mes projets" };

export default function MesProjetsPage() {
  return (
    <LocalizedFeature feature="mesProjets">
      <LeadProjectsBoard />
    </LocalizedFeature>
  );
}

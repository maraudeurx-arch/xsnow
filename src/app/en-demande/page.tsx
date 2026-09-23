import { LocalizedFeature } from "@/components/LocalizedFeature";
import { DemandBoard } from "@/components/features/DemandBoard";

export const metadata = { title: "Demandes" };

export default function EnDemandePage() {
  return (
    <LocalizedFeature feature="enDemande">
      <DemandBoard />
    </LocalizedFeature>
  );
}

import { AttributesBoard } from "@/components/features/AttributesBoard";
import { LocalizedFeature } from "@/components/LocalizedFeature";

export const metadata = { title: "Vos attributs" };

export default function AttributsPage() {
  return (
    <LocalizedFeature feature="attributs">
      <AttributesBoard />
    </LocalizedFeature>
  );
}

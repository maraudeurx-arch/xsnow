import { LocalizedFeature } from "@/components/LocalizedFeature";
import { IdeasBoard } from "@/components/features/IdeasBoard";

export const metadata = { title: "Vos idées" };

export default function VosIdeesPage() {
  return (
    <LocalizedFeature feature="vosIdees" compact>
      <IdeasBoard />
    </LocalizedFeature>
  );
}

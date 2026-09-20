import { ProximityBoard } from "@/components/features/ProximityBoard";
import { LocalizedFeature } from "@/components/LocalizedFeature";

export const metadata = { title: "Proximité" };

export default function ProximitePage() {
  return (
    <LocalizedFeature feature="proximite">
      <ProximityBoard />
    </LocalizedFeature>
  );
}

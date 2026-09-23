import { LocalizedFeature } from "@/components/LocalizedFeature";
import { MyServicesBoard } from "@/components/features/MyServicesBoard";

export const metadata = { title: "Mes services" };

export default function MesServicesPage() {
  return (
    <LocalizedFeature feature="mesServices">
      <MyServicesBoard />
    </LocalizedFeature>
  );
}

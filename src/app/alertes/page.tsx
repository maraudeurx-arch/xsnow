import { AlertBoard } from "@/components/features/AlertBoard";
import { LocalizedFeature } from "@/components/LocalizedFeature";

export const metadata = { title: "Alertes" };

export default function AlertesPage() {
  return (
    <LocalizedFeature feature="alertes">
      <AlertBoard />
    </LocalizedFeature>
  );
}

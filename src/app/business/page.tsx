import { BusinessBoard } from "@/components/features/BusinessBoard";
import { LocalizedFeature } from "@/components/LocalizedFeature";

export const metadata = { title: "Business" };

export default function BusinessPage() {
  return (
    <LocalizedFeature feature="business">
      <BusinessBoard />
    </LocalizedFeature>
  );
}

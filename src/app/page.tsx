import { Guide } from "@/components/Guide";
import { ServicesShowcase } from "@/components/ServicesShowcase";

export default function HomePage() {
  return (
    <div className="flex w-full flex-col items-center gap-8">
      <Guide />
      <ServicesShowcase />
    </div>
  );
}

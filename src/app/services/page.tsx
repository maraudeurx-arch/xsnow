import Link from "next/link";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";
import { SERVICE_LIST } from "@/lib/services";

export const metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.services.title} lead={FEATURE_COPY.services.lead}>
      <ul className="grid gap-2">
        {SERVICE_LIST.map((service) => (
          <li key={service.kind}>
            <Link
              href={service.href}
              className="tap flex min-h-14 flex-col justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:border-gold/50"
            >
              <span className="font-extrabold">{service.title}</span>
              <span className="text-sm text-ice/80">{service.lead}</span>
            </Link>
          </li>
        ))}
      </ul>
    </FeaturePanel>
  );
}

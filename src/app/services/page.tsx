import Link from "next/link";
import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY, SAFETY_SERVICES_MENU } from "@/lib/content";

export const metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <FeaturePanel title={FEATURE_COPY.services.title} lead={FEATURE_COPY.services.lead}>
      <ul className="grid gap-2">
        {SAFETY_SERVICES_MENU.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="tap flex min-h-14 flex-col justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:border-gold/50"
            >
              <span className="font-extrabold">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </FeaturePanel>
  );
}

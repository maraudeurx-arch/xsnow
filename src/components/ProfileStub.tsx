import Link from "next/link";
import { type ReactNode } from "react";
import { FeaturePanel } from "@/components/FeaturePanel";

export function ProfileStub({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <FeaturePanel title={title} lead={lead}>
      <div className="space-y-4">
        {children}
        <Link
          href="/mon-profil"
          className="inline-flex min-h-11 items-center text-sm font-extrabold text-gold hover:underline"
        >
          ← Mon profil
        </Link>
      </div>
    </FeaturePanel>
  );
}

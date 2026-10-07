// Only routed when the app is built with NEXT_PUBLIC_TUTORAT=1: next.config.ts then adds
// the `tutorat.tsx` page extension. Without the flag this file is ignored and absent from the export.

import { Suspense } from "react";

import { TutoratPreview } from "@/components/tutorat/TutoratPreview";

export const metadata = {
  title: "Tutorat (aperçu)",
  robots: { index: false, follow: false, nocache: true },
};

export default function TutoratPage() {
  return (
    <Suspense>
      <TutoratPreview />
    </Suspense>
  );
}

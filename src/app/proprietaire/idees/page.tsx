import { Suspense } from "react";
import { OwnerIdeasBoard } from "@/components/features/OwnerIdeasBoard";

export const metadata = {
  title: "Boîte d’idées",
  robots: { index: false, follow: false },
};

export default function OwnerIdeasPage() {
  return (
    <Suspense>
      <OwnerIdeasBoard />
    </Suspense>
  );
}

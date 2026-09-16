"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Mes infos merged into Mon profil (Modifier le profil). Keep URL as a soft redirect. */
export default function MesInfosPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/mon-profil/");
  }, [router]);
  return null;
}

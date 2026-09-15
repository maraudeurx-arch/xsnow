"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/locale";

export default function NotFound() {
  const { m } = useI18n();
  return (
    <div className="text-center">
      <p className="font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">
        {m.notFound.title}
      </p>
      <Link href="/" className="tap mt-4 inline-flex items-center rounded-full bg-cobalt px-5 font-extrabold text-snow">
        {m.notFound.back}
      </Link>
    </div>
  );
}

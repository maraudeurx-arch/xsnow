"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/locale";
import { PRIVACY_HREF, TERMS_HREF } from "@/lib/paths";

export function LegalLinks({ className = "" }: { className?: string }) {
  const { m } = useI18n();
  return (
    <p className={className}>
      <Link href={PRIVACY_HREF} className="font-extrabold text-gold hover:underline">
        {m.footer.privacy}
      </Link>
      <span className="text-snow/50"> · </span>
      <Link href={TERMS_HREF} className="font-extrabold text-gold hover:underline">
        {m.footer.terms}
      </Link>
    </p>
  );
}

"use client";

import {
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
  GITHUB_SECURITY_MD_URL,
  OPC_PUBLIC_EMAIL,
  OPC_PUBLIC_MAILTO,
} from "@/lib/paths";
import { useI18n } from "@/lib/i18n/locale";

const external = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

export function TrustContact({ showSecurityPolicy = false }: { showSecurityPolicy?: boolean }) {
  const { m } = useI18n();

  return (
    <ul className="mt-4 space-y-2 text-[13px] leading-relaxed text-ice/90">
      <li>
        <a href={GITHUB_REPO_URL} className="font-extrabold text-gold hover:underline" {...external}>
          {m.trust.github}
        </a>
        <span className="text-ice/70"> — maraudeurx-arch/xsnow</span>
      </li>
      <li>
        <a href={GITHUB_ISSUES_URL} className="font-extrabold text-gold hover:underline" {...external}>
          {m.trust.issues}
        </a>
      </li>
      <li>
        <span className="font-semibold text-snow">{m.trust.emailLabel}</span>
        {" — "}
        <a href={OPC_PUBLIC_MAILTO} className="font-extrabold text-gold hover:underline" rel="noopener noreferrer">
          {OPC_PUBLIC_EMAIL}
        </a>
      </li>
      {showSecurityPolicy ? (
        <li>
          <a
            href={GITHUB_SECURITY_MD_URL}
            className="font-extrabold text-gold hover:underline"
            {...external}
          >
            {m.trust.securityMd}
          </a>
        </li>
      ) : null}
    </ul>
  );
}

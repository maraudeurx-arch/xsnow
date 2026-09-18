import { type ReactNode } from "react";
import { HomeBackLink } from "@/components/HomeBackLink";

export function FeaturePanel({
  title,
  lead,
  children,
  compact = false,
  homeBack = true,
}: {
  title: string;
  lead: string;
  children: ReactNode;
  compact?: boolean;
  homeBack?: boolean;
}) {
  return (
    <section
      className={`opc-glass w-full max-w-xl rounded-3xl text-center ${
        compact ? "p-3 sm:p-5" : "p-4 sm:p-6"
      }`}
    >
      {homeBack ? (
        <div className="opc-glass-soft sticky top-0 z-10 -mx-1 mb-3 rounded-2xl py-1">
          <HomeBackLink />
        </div>
      ) : null}
      {title ? (
        <h2
          className={`font-[family-name:var(--font-fraunces)] text-balance font-extrabold text-snow ${
            compact ? "text-xl" : "text-2xl"
          }`}
        >
          {title}
        </h2>
      ) : null}
      {lead ? (
        <p
          className={`mx-auto max-w-md text-sm leading-relaxed text-pretty text-ice/85 ${
            compact ? "mt-1" : "mt-2"
          }`}
        >
          {lead}
        </p>
      ) : null}
      <div className={compact ? "mt-3 text-left" : "mt-5 text-left"}>{children}</div>
    </section>
  );
}

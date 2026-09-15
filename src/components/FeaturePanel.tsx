import { type ReactNode } from "react";

export function FeaturePanel({
  title,
  lead,
  children,
  compact = false,
}: {
  title: string;
  lead: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`w-full max-w-xl rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,26,0.94)_0%,rgba(8,8,10,0.94)_100%)] text-center shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-md ${
        compact ? "p-3 sm:p-5" : "p-4 sm:p-6"
      }`}
    >
      <h2
        className={`font-[family-name:var(--font-fraunces)] text-balance font-extrabold text-snow ${
          compact ? "text-xl" : "text-2xl"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mx-auto max-w-md text-sm leading-relaxed text-pretty text-ice/85 ${
          compact ? "mt-1" : "mt-2"
        }`}
      >
        {lead}
      </p>
      <div className={compact ? "mt-3 text-left" : "mt-5 text-left"}>{children}</div>
    </section>
  );
}

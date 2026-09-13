import { type ReactNode } from "react";

export function FeaturePanel({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-[rgba(8,20,34,0.72)] p-4 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-6">
      <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-balance font-extrabold text-snow">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-pretty text-ice/85">
        {lead}
      </p>
      <div className="mt-5 text-left">{children}</div>
    </section>
  );
}

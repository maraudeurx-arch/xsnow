import { BRAND } from "@/lib/content";

export function ConstructionWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center overflow-hidden"
    >
      <p className="watermark-text select-none text-[clamp(2.4rem,14vw,9rem)] font-black uppercase text-white/[0.08]">
        {BRAND.watermark}
      </p>
    </div>
  );
}

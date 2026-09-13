import { BRAND } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="relative z-20 mt-auto px-3 pb-3 pt-6 text-center">
      <p className="text-[13px] leading-relaxed font-medium text-ice/80">
        {BRAND.footer}
      </p>
    </footer>
  );
}

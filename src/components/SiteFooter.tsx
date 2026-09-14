import { BRAND } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="relative z-20 shrink-0 px-3 py-1 text-center">
      <p className="truncate text-[10px] leading-none font-medium text-ice/70">
        {BRAND.footer}
      </p>
    </footer>
  );
}

import Link from "next/link";
import { assetUrl } from "@/lib/paths";

/** White network mark for the dark header. Display ~32px on iPhone, 36px from sm. */
export function BrandLogo() {
  return (
    <Link
      href="/"
      aria-label="Open Community"
      className="inline-flex size-9 shrink-0 items-center justify-center"
    >
      {/* Plain img: next/image omitted basePath and 404'd on GitHub Pages. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetUrl("/brand/open-community-logo.svg")}
        alt=""
        width={36}
        height={36}
        decoding="async"
        draggable={false}
        className="size-[32px] sm:size-9"
      />
    </Link>
  );
}

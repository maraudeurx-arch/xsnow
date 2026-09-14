import Link from "next/link";
import { assetUrl } from "@/lib/paths";

/** Official white network mark for the dark header. ~36px on iPhone. */
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
        src={assetUrl("/brand/open-community-logo-white.png")}
        alt=""
        width={1024}
        height={1024}
        decoding="async"
        draggable={false}
        className="size-9"
      />
    </Link>
  );
}

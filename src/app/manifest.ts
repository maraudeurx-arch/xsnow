import type { MetadataRoute } from "next";
import { PWA_SCOPE, assetUrl } from "@/lib/paths";

export const dynamic = "force-static";
export const revalidate = false;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Open Community",
    short_name: "OPC",
    description: "Open Community — Monétisé Vous! Entraide de quartier.",
    // Next 16 static export does not prefix MetadataRoute.Manifest paths with
    // basePath — `/` here launched the GitHub user site, not /xsnow/.
    id: PWA_SCOPE,
    start_url: PWA_SCOPE,
    scope: PWA_SCOPE,
    display: "standalone",
    background_color: "#050506",
    theme_color: "#050506",
    lang: "fr",
    icons: [
      {
        src: assetUrl("/brand/app-icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: assetUrl("/brand/app-icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: assetUrl("/brand/app-icon-1024.png"),
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

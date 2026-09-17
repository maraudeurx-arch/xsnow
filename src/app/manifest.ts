import type { MetadataRoute } from "next";
import { absoluteAssetUrl, pwaManifestLaunch } from "@/lib/paths";

export const dynamic = "force-static";
export const revalidate = false;

export default function manifest(): MetadataRoute.Manifest {
  const launch = pwaManifestLaunch();
  return {
    name: "Open Community",
    short_name: "OPC",
    description: "Open Community — Monétisé Vous! Entraide de quartier.",
    // Absolute custom-domain URLs so Home Screen does not pin github.io.
    id: launch.id,
    start_url: launch.start_url,
    scope: launch.scope,
    display: "standalone",
    background_color: "#050506",
    theme_color: "#050506",
    lang: "fr",
    icons: [
      {
        src: absoluteAssetUrl("/brand/app-icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: absoluteAssetUrl("/brand/app-icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: absoluteAssetUrl("/brand/app-icon-1024.png"),
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

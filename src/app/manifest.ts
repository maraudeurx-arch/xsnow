import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/paths";

export const dynamic = "force-static";
export const revalidate = false;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Open Community",
    short_name: "OPC",
    description: "Open Community — Monétisé Vous! Entraide de quartier.",
    id: `${BASE_PATH}/`,
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    background_color: "#050506",
    theme_color: "#050506",
    lang: "fr",
    icons: [
      {
        src: `${BASE_PATH}/brand/app-icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${BASE_PATH}/brand/app-icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${BASE_PATH}/brand/app-icon-1024.png`,
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

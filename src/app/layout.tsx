import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { AppChrome } from "@/components/AppChrome";
import { Providers } from "@/app/providers";
import { CONTENT_SECURITY_POLICY } from "@/lib/csp";
import { PWA_ASSET_ORIGIN, assetUrl } from "@/lib/paths";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(`${PWA_ASSET_ORIGIN}/`),
  title: {
    default: "Open Community",
    template: "%s · Open Community",
  },
  description:
    "Open Community — Monétisez-vous ! Proximité, entraide et visibilité locale.",
  applicationName: "Open Community",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: assetUrl("/icon.png"), sizes: "64x64", type: "image/png" },
      { url: assetUrl("/brand/app-icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: assetUrl("/brand/app-icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: assetUrl("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Open Community",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050506",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${outfit.variable} ${fraunces.variable} ${jakarta.variable} h-full antialiased`}
    >
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CONTENT_SECURITY_POLICY} />
      </head>
      <body className="min-h-full min-h-svh min-h-dvh">
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}

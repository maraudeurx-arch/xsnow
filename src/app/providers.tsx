"use client";

import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
  type Locale as RainbowKitLocale,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import { AnalyticsRoot } from "@/components/AnalyticsRoot";
import type { Locale } from "@/lib/i18n";
import { LocaleProvider, useI18n } from "@/lib/i18n/locale";
import { PlaceProvider } from "@/lib/place";
import { SpeechProvider } from "@/lib/speech";
import { StubWalletProvider, hasWalletConnectProjectId } from "@/lib/wallet";
import "@rainbow-me/rainbowkit/styles.css";

function rainbowKitLocale(locale: Locale): RainbowKitLocale {
  if (locale === "fr") return "fr";
  if (locale === "es") return "es";
  return "en-US";
}

const queryClient = new QueryClient();

const walletConfig = getDefaultConfig({
  appName: "GATINEAU Open Community",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    "00000000000000000000000000000000",
  chains: [sepolia],
  ssr: true,
});

function RainbowStack({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const rainbowLocale = rainbowKitLocale(locale);
  return (
    <WagmiProvider config={walletConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale={rainbowLocale}
          theme={darkTheme({
            accentColor: "#2563eb",
            accentColorForeground: "#f4f6fb",
            borderRadius: "large",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [useRainbow] = useState(hasWalletConnectProjectId);

  return (
    <LocaleProvider>
      <PlaceProvider>
        <AnalyticsRoot />
        <SpeechProvider>
          {useRainbow ? (
            <RainbowStack>{children}</RainbowStack>
          ) : (
            <StubWalletProvider>{children}</StubWalletProvider>
          )}
        </SpeechProvider>
      </PlaceProvider>
    </LocaleProvider>
  );
}

"use client";

import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
  type Locale as RainbowKitLocale,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  trustWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { AnalyticsRoot } from "@/components/AnalyticsRoot";
import { ConsentSheet } from "@/components/ConsentSheet";
import { DeviceMemoryBoot } from "@/components/DeviceMemoryBoot";
import type { Locale } from "@/lib/i18n";
import { LocaleProvider, useI18n } from "@/lib/i18n/locale";
import { PUBLIC_SITE_URL, absoluteAssetUrl } from "@/lib/paths";
import { PlaceProvider } from "@/lib/place";
import { SpeechProvider } from "@/lib/speech";
import { primaryChain, resolveWalletChains } from "@/lib/wallet-chains";
import {
  StubWalletProvider,
  enableTestnets,
  walletConnectProjectId,
} from "@/lib/wallet";
import "@rainbow-me/rainbowkit/styles.css";

function rainbowKitLocale(locale: Locale): RainbowKitLocale {
  if (locale === "fr") return "fr";
  if (locale === "es") return "es";
  return "en-US";
}

const queryClient = new QueryClient();

const projectId = walletConnectProjectId();
const walletChains = resolveWalletChains(enableTestnets());

const walletConfig = projectId
  ? getDefaultConfig({
      appName: "Open Community",
      appDescription: "Open Community — Monétisez-vous !",
      appUrl: PUBLIC_SITE_URL,
      appIcon: absoluteAssetUrl("/brand/app-icon-192.png"),
      projectId,
      chains: walletChains,
      ssr: true,
      wallets: [
        {
          groupName: "WalletConnect",
          wallets: [walletConnectWallet],
        },
        {
          groupName: "Wallets",
          wallets: [injectedWallet, metaMaskWallet, rainbowWallet, trustWallet],
        },
      ],
    })
  : null;

function RainbowStack({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const rainbowLocale = rainbowKitLocale(locale);
  if (!walletConfig) return children;
  return (
    <WagmiProvider config={walletConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale={rainbowLocale}
          initialChain={primaryChain}
          modalSize="compact"
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
  return (
    <LocaleProvider>
      <PlaceProvider>
        <AnalyticsRoot />
        <DeviceMemoryBoot />
        <ConsentSheet />
        <SpeechProvider>
          {walletConfig ? (
            <RainbowStack>{children}</RainbowStack>
          ) : (
            <StubWalletProvider>{children}</StubWalletProvider>
          )}
        </SpeechProvider>
      </PlaceProvider>
    </LocaleProvider>
  );
}

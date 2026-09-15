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
import { sepolia } from "wagmi/chains";
import { AnalyticsRoot } from "@/components/AnalyticsRoot";
import { ConsentSheet } from "@/components/ConsentSheet";
import type { Locale } from "@/lib/i18n";
import { LocaleProvider, useI18n } from "@/lib/i18n/locale";
import { PlaceProvider } from "@/lib/place";
import { SpeechProvider } from "@/lib/speech";
import {
  StubWalletProvider,
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

const walletConfig = projectId
  ? getDefaultConfig({
      appName: "GATINEAU Open Community",
      appDescription: "Open Community — Monétisé Vous!",
      appUrl: "https://maraudeurx-arch.github.io/xsnow/",
      appIcon: "https://maraudeurx-arch.github.io/xsnow/brand/app-icon-192.png",
      projectId,
      chains: [sepolia],
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
          initialChain={sepolia}
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

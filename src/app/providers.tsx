"use client";

import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import { PlaceProvider } from "@/lib/place";
import { SpeechProvider } from "@/lib/speech";
import { StubWalletProvider, hasWalletConnectProjectId } from "@/lib/wallet";
import "@rainbow-me/rainbowkit/styles.css";

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
  return (
    <WagmiProvider config={walletConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale="fr"
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
    <PlaceProvider>
      <SpeechProvider>
        {useRainbow ? (
          <RainbowStack>{children}</RainbowStack>
        ) : (
          <StubWalletProvider>{children}</StubWalletProvider>
        )}
      </SpeechProvider>
    </PlaceProvider>
  );
}

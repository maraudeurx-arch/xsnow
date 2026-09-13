"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WalletContextValue = {
  connected: boolean;
  label: string;
  connect: () => void;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function StubWalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => setConnected(true), []);
  const disconnect = useCallback(() => setConnected(false), []);

  const value = useMemo(
    () => ({
      connected,
      label: connected ? "Invité · Sepolia" : "Connect",
      connect,
      disconnect,
    }),
    [connected, connect, disconnect],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useStubWallet() {
  return useContext(WalletContext);
}

export function hasWalletConnectProjectId() {
  const id = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  return Boolean(id && /^[a-f0-9]{32}$/i.test(id));
}

"use client";

import { type ReactNode } from "react";

export {
  enableTestnets,
  hasWalletConnectProjectId,
  isWalletConnectProjectId,
  parseEnableTestnets,
  walletConnectProjectId,
} from "@/lib/wallet-config";

/** Last-resort tree when no WalletConnect project id is inlined at build time. */
export function StubWalletProvider({ children }: { children: ReactNode }) {
  return children;
}

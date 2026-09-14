"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { hasWalletConnectProjectId, useStubWallet } from "@/lib/wallet";

const btnClass =
  "inline-flex min-h-[22px] shrink-0 items-center justify-center rounded-full border border-cobalt/60 bg-cobalt px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-snow shadow-[0_4px_14px_rgba(37,99,235,0.38)] transition hover:brightness-110";

function StubConnect() {
  const wallet = useStubWallet();
  if (!wallet) {
    return (
      <button type="button" className={btnClass}>
        Connect
      </button>
    );
  }

  return (
    <button
      type="button"
      className={btnClass}
      onClick={wallet.connected ? wallet.disconnect : wallet.connect}
      aria-label={wallet.connected ? "Déconnecter le portefeuille" : "Connecter le portefeuille"}
    >
      {wallet.label}
    </button>
  );
}

function RainbowConnect() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <button
            type="button"
            className={btnClass}
            onClick={
              !connected
                ? openConnectModal
                : chain.unsupported
                  ? openChainModal
                  : openAccountModal
            }
          >
            {!connected
              ? "Connect"
              : chain.unsupported
                ? "Mauvais réseau"
                : account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function ConnectWallet() {
  if (hasWalletConnectProjectId()) {
    return <RainbowConnect />;
  }
  return <StubConnect />;
}

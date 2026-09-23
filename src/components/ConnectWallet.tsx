"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { hasWalletConnectProjectId } from "@/lib/wallet";

const btnClass = (compact: boolean) =>
  `inline-flex shrink-0 items-center justify-center truncate border border-cobalt bg-white font-bold tracking-tight text-cobalt transition hover:bg-cobalt/5 ${
    compact
      ? "min-h-[var(--home-nav-h)] w-full min-w-0 rounded-full px-1.5 py-0 text-[12px] leading-[1.15]"
      : "tap min-h-11 rounded-full px-3.5 py-0.5 text-sm"
  }`;

function UnconfiguredConnect({ compact }: { compact: boolean }) {
  const { m } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hintId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className={`relative inline-flex min-w-0 flex-col ${compact ? "w-full" : "items-end"}`}>
      <button
        type="button"
        className={btnClass(compact)}
        aria-expanded={open}
        aria-controls={open ? hintId : undefined}
        aria-label={m.wallet.connectAria}
        onClick={() => setOpen((value) => !value)}
      >
        {m.wallet.connect}
      </button>
      {open ? (
        <p
          id={hintId}
          role="status"
          className="opc-glass-menu absolute right-0 top-full z-40 mt-1 w-max max-w-[16rem] rounded-md px-2 py-1 text-left text-[10px] font-semibold leading-snug text-snow"
        >
          {m.wallet.needsConfig}
        </p>
      ) : null}
    </div>
  );
}

function RainbowConnect({ compact }: { compact: boolean }) {
  const { m } = useI18n();
  return (
    <div className={compact ? "min-w-0 w-full" : undefined}>
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && Boolean(account && chain);
        const unsupported = Boolean(connected && chain?.unsupported);
        const label = !connected
          ? m.wallet.connect
          : unsupported
            ? m.wallet.wrongNetwork
            : (account?.displayName ?? m.wallet.connect);
        const ariaLabel = !connected
          ? m.wallet.connectAria
          : unsupported
            ? m.wallet.wrongNetwork
            : m.wallet.disconnect;

        return (
          <button
            type="button"
            className={btnClass(compact)}
            disabled={!ready}
            aria-label={ariaLabel}
            onClick={
              !connected
                ? openConnectModal
                : unsupported
                  ? openChainModal
                  : openAccountModal
            }
          >
            {label}
          </button>
        );
      }}
    </ConnectButton.Custom>
    </div>
  );
}

export function ConnectWallet({ compact = false }: { compact?: boolean }) {
  if (hasWalletConnectProjectId()) {
    return <RainbowConnect compact={compact} />;
  }
  return <UnconfiguredConnect compact={compact} />;
}

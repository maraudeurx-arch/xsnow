"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { hasWalletConnectProjectId } from "@/lib/wallet";

const btnClass = (compact: boolean) =>
  `inline-flex shrink-0 items-center justify-center border border-cobalt/60 bg-cobalt font-extrabold tracking-wide text-snow shadow-[0_4px_14px_rgba(37,99,235,0.38)] transition hover:brightness-110 ${
    compact
      ? "min-h-[var(--home-nav-h)] w-full min-w-0 rounded-lg px-0.5 py-0 text-[10px] leading-[1.05]"
      : "tap min-h-11 rounded-full px-3 py-0.5 text-[12px]"
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
          className="absolute right-0 top-full z-40 mt-1 w-max max-w-[16rem] rounded-md border border-white/15 bg-[rgba(8,8,10,0.94)] px-2 py-1 text-left text-[10px] font-semibold leading-snug text-snow shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
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

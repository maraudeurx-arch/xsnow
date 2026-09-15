"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { hasWalletConnectProjectId } from "@/lib/wallet";

const btnClass =
  "tap inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-cobalt/60 bg-cobalt px-3 py-0.5 text-[11px] font-extrabold tracking-wide text-snow shadow-[0_4px_14px_rgba(37,99,235,0.38)] transition hover:brightness-110";

function UnconfiguredConnect() {
  const { m } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hintId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative inline-flex flex-col items-end">
      <button
        type="button"
        className={btnClass}
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

function RainbowConnect() {
  const { m } = useI18n();
  return (
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
            className={btnClass}
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
  );
}

export function ConnectWallet() {
  if (hasWalletConnectProjectId()) {
    return <RainbowConnect />;
  }
  return <UnconfiguredConnect />;
}

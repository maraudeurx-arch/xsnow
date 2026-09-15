import { base, mainnet, sepolia, type Chain } from "wagmi/chains";

/** WalletConnect uses the first configured chain as the session target. */
export const primaryChain = mainnet;

/**
 * Chains advertised to RainbowKit / wagmi / WalletConnect.
 * Mainnet first so mobile wallets that only list Ethereum can approve the session.
 * Base is a widely supported L2 (Rainbow, Coinbase, MetaMask).
 * Sepolia stays optional for later test features when ENABLE_TESTNETS is on.
 */
export function resolveWalletChains(
  includeTestnets: boolean,
): readonly [Chain, ...Chain[]] {
  if (includeTestnets) {
    return [mainnet, base, sepolia];
  }
  return [mainnet, base];
}

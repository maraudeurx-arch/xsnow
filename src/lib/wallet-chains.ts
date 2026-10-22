import { base, baseSepolia, mainnet, sepolia, type Chain } from "wagmi/chains";

/** WalletConnect uses the first configured chain as the session target. */
export const primaryChain = mainnet;

/**
 * Chains advertised to RainbowKit / wagmi / WalletConnect.
 * Mainnet first so mobile wallets that only list Ethereum can approve the session.
 * Base is a widely supported L2 (Rainbow, Coinbase, MetaMask).
 * Sepolia stays optional for later test features when ENABLE_TESTNETS is on.
 * Base Sepolia (84532) too: arbiter wallets are connected on Base Sepolia (test only, no payment).
 */
export function resolveWalletChains(
  includeTestnets: boolean,
): readonly [Chain, ...Chain[]] {
  if (includeTestnets) {
    return [mainnet, base, sepolia, baseSepolia];
  }
  return [mainnet, base];
}

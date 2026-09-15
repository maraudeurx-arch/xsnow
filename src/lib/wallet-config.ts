const PROJECT_ID_RE = /^[a-f0-9]{32}$/i;
const ZERO_PROJECT_ID = "0".repeat(32);

/** True for a real Reown / WalletConnect Cloud project id (32 hex chars, not all zeros). */
export function isWalletConnectProjectId(id: string | undefined | null): boolean {
  const trimmed = id?.trim() ?? "";
  if (!PROJECT_ID_RE.test(trimmed)) return false;
  return trimmed.toLowerCase() !== ZERO_PROJECT_ID;
}

export function walletConnectProjectId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
  if (!id || !isWalletConnectProjectId(id)) return undefined;
  return id;
}

export function hasWalletConnectProjectId(): boolean {
  return Boolean(walletConnectProjectId());
}

/**
 * When true (default if unset), Sepolia is advertised as an extra optional chain.
 * Ethereum mainnet remains the primary connect target either way.
 */
export function parseEnableTestnets(value: string | undefined | null): boolean {
  const v = value?.trim().toLowerCase();
  if (!v) return true;
  return v !== "false" && v !== "0" && v !== "no";
}

export function enableTestnets(): boolean {
  return parseEnableTestnets(process.env.NEXT_PUBLIC_ENABLE_TESTNETS);
}

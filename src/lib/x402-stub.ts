/** Optional Coinbase x402 modules are not bundled on Vercel Hobby. */
export function toClientEvmSigner() {
  throw new Error("x402 is not enabled in this build");
}

export function registerExactEvmScheme() {}
export function registerExactSvmScheme() {}
export class UptoEvmScheme {}
export class ExactSvmScheme {}
export function fromCdpSmartWallet() {
  throw new Error("x402 is not enabled in this build");
}
export function cdpSolanaAccountToSvmSigner() {
  throw new Error("x402 is not enabled in this build");
}

const x402Stub = {};
export default x402Stub;

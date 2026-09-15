import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { base, mainnet, sepolia } from "wagmi/chains";
import { primaryChain, resolveWalletChains } from "./wallet-chains.ts";

describe("resolveWalletChains", () => {
  it("puts Ethereum mainnet first so WalletConnect can target a widely supported chain", () => {
    const withTestnets = resolveWalletChains(true);
    const withoutTestnets = resolveWalletChains(false);

    assert.equal(primaryChain.id, 1);
    assert.equal(withTestnets[0], mainnet);
    assert.equal(withoutTestnets[0], mainnet);
    assert.equal(withTestnets[0].id, mainnet.id);
  });

  it("keeps Base as a widely supported L2 and Sepolia only when testnets are on", () => {
    const withTestnets = resolveWalletChains(true);
    const withoutTestnets = resolveWalletChains(false);

    assert.deepEqual(
      withTestnets.map((chain) => chain.id),
      [mainnet.id, base.id, sepolia.id],
    );
    assert.deepEqual(
      withoutTestnets.map((chain) => chain.id),
      [mainnet.id, base.id],
    );
    assert.ok(!withoutTestnets.some((chain) => chain.id === sepolia.id));
  });
});

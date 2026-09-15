import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isWalletConnectProjectId, parseEnableTestnets } from "./wallet-config.ts";

describe("isWalletConnectProjectId", () => {
  it("accepts a 32-char hex Reown / WalletConnect Cloud id", () => {
    assert.equal(
      isWalletConnectProjectId("a1b2c3d4e5f60718293a4b5c6d7e8f90"),
      true,
    );
    assert.equal(
      isWalletConnectProjectId("  A1B2C3D4E5F60718293A4B5C6D7E8F90  "),
      true,
    );
  });

  it("rejects missing, short, or placeholder ids", () => {
    assert.equal(isWalletConnectProjectId(undefined), false);
    assert.equal(isWalletConnectProjectId(""), false);
    assert.equal(isWalletConnectProjectId("not-a-project-id"), false);
    assert.equal(isWalletConnectProjectId("00000000000000000000000000000000"), false);
    assert.equal(isWalletConnectProjectId("a1b2c3d4e5f60718293a4b5c6d7e8f9"), false);
  });
});

describe("parseEnableTestnets", () => {
  it("defaults to true so Sepolia stays available as an extra chain", () => {
    assert.equal(parseEnableTestnets(undefined), true);
    assert.equal(parseEnableTestnets(""), true);
    assert.equal(parseEnableTestnets("true"), true);
    assert.equal(parseEnableTestnets("false"), false);
    assert.equal(parseEnableTestnets("0"), false);
  });
});

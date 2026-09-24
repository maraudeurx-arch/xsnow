import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  OPC_LOOK_BOOT_SCRIPT,
  OPC_LOOK_EPOCH_MS,
  OPC_LOOK_PERIOD_MS,
  opcLookFor,
  resolveOpcLook,
} from "./opc-look.ts";

describe("opc look cycle", () => {
  it("uses a fixed 14-day epoch starting 2026-01-01", () => {
    assert.equal(OPC_LOOK_EPOCH_MS, Date.UTC(2026, 0, 1));
    assert.equal(OPC_LOOK_PERIOD_MS, 14 * 24 * 60 * 60 * 1000);
    assert.match(OPC_LOOK_BOOT_SCRIPT, new RegExp(String(OPC_LOOK_EPOCH_MS)));
    assert.match(OPC_LOOK_BOOT_SCRIPT, /data-opc-look/);
    assert.match(OPC_LOOK_BOOT_SCRIPT, /opc-look/);
    const boot = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../public/opc-look.js"),
      "utf8",
    );
    assert.equal(boot.trim(), OPC_LOOK_BOOT_SCRIPT);
  });

  it("alternates A on even periods and B on odd periods", () => {
    assert.equal(opcLookFor(OPC_LOOK_EPOCH_MS), "a");
    assert.equal(opcLookFor(OPC_LOOK_EPOCH_MS + OPC_LOOK_PERIOD_MS - 1), "a");
    assert.equal(opcLookFor(OPC_LOOK_EPOCH_MS + OPC_LOOK_PERIOD_MS), "b");
    assert.equal(opcLookFor(OPC_LOOK_EPOCH_MS + OPC_LOOK_PERIOD_MS * 2), "a");
    assert.equal(opcLookFor(OPC_LOOK_EPOCH_MS - 1), "b");
    assert.equal(opcLookFor(OPC_LOOK_EPOCH_MS - OPC_LOOK_PERIOD_MS), "b");
    assert.equal(opcLookFor(OPC_LOOK_EPOCH_MS - OPC_LOOK_PERIOD_MS - 1), "a");
  });

  it("lets ?opc-look preview either look", () => {
    assert.equal(resolveOpcLook(OPC_LOOK_EPOCH_MS, "b"), "b");
    assert.equal(resolveOpcLook(OPC_LOOK_EPOCH_MS + OPC_LOOK_PERIOD_MS, "a"), "a");
    assert.equal(resolveOpcLook(OPC_LOOK_EPOCH_MS, null), "a");
    assert.equal(resolveOpcLook(OPC_LOOK_EPOCH_MS, "nope"), "a");
  });

  it("is Look B on 2026-09-24 (period 19)", () => {
    const now = Date.UTC(2026, 8, 24, 19, 28);
    assert.equal(Math.floor((now - OPC_LOOK_EPOCH_MS) / OPC_LOOK_PERIOD_MS), 19);
    assert.equal(opcLookFor(now), "b");
  });
});

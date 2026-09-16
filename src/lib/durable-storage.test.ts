import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  DURABLE_IDB_NAME,
  durableGet,
  durableSet,
  ensureDurableHydration,
  hydrateDurableFromBackup,
  isBlankDurableValue,
  isDurableBootReady,
  resetDurableStorageForTests,
  setDurableBackupForTests,
  shouldRestoreFromBackup,
} from "./durable-storage.ts";

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    removeItem(key: string) {
      delete data[key];
    },
    clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
    key() {
      return null;
    },
    get length() {
      return Object.keys(data).length;
    },
    data,
  } as Storage & { data: Record<string, string> };
}

beforeEach(() => {
  resetDurableStorageForTests();
});

describe("shouldRestoreFromBackup", () => {
  it("restores when local is missing, blank, or JSON null", () => {
    assert.equal(shouldRestoreFromBackup(null, `"homme-blanc"`), true);
    assert.equal(shouldRestoreFromBackup("", `"homme-blanc"`), true);
    assert.equal(shouldRestoreFromBackup("null", `"homme-blanc"`), true);
    assert.equal(shouldRestoreFromBackup("undefined", `"homme-blanc"`), true);
    assert.equal(shouldRestoreFromBackup(`"femme-noire"`, `"homme-blanc"`), false);
    assert.equal(shouldRestoreFromBackup(null, null), false);
    assert.equal(shouldRestoreFromBackup(null, ""), false);
  });

  it("restores a wiped list from a non-empty backup", () => {
    assert.equal(shouldRestoreFromBackup("[]", JSON.stringify([{ id: "1" }])), true);
    assert.equal(shouldRestoreFromBackup("[]", "[]"), false);
    assert.equal(shouldRestoreFromBackup(JSON.stringify([{ id: "1" }]), JSON.stringify([{ id: "2" }])), false);
  });
});

describe("blank durable values", () => {
  it("treats empty, null, and undefined tokens as blank", () => {
    assert.equal(isBlankDurableValue(null), true);
    assert.equal(isBlankDurableValue(""), true);
    assert.equal(isBlankDurableValue("null"), true);
    assert.equal(isBlankDurableValue("[]"), false);
    assert.equal(isBlankDurableValue(`"homme-blanc"`), false);
  });
});

describe("boot restore race", () => {
  it("copies backup into empty localStorage and marks boot ready", async () => {
    const local = memoryStore();
    const backup = new Map<string, string>([
      ["xsnow.avatar", JSON.stringify("homme-blanc")],
      [
        "xsnow.localProfile",
        JSON.stringify({
          id: "OPC-7K3M",
          firstName: "Marie",
          lastName: "Tremblay",
          email: "marie@voisin.test",
          phone: "819-555-0100",
        }),
      ],
    ]);
    setDurableBackupForTests(backup);
    assert.equal(isDurableBootReady(), false);
    const restored = await ensureDurableHydration(["xsnow.avatar", "xsnow.localProfile"], local);
    assert.ok(restored >= 2);
    assert.equal(isDurableBootReady(), true);
    assert.equal(durableGet("xsnow.avatar", local), JSON.stringify("homme-blanc"));
    assert.match(durableGet("xsnow.localProfile", local) ?? "", /OPC-7K3M/);
  });

  it("does not let an empty write during boot wipe a richer backup", async () => {
    const local = memoryStore();
    const backup = new Map<string, string>();
    setDurableBackupForTests(backup);
    durableSet("xsnow.avatar", JSON.stringify("femme-noire"), local);
    durableSet("xsnow.ideas", JSON.stringify([{ id: "kept", text: "Prêter une perceuse" }]), local);
    assert.equal(backup.get("xsnow.ideas")?.includes("Prêter une perceuse"), true);

    local.clear();
    assert.equal(durableGet("xsnow.avatar", local), null);

    const boot = ensureDurableHydration(["xsnow.avatar", "xsnow.ideas"], local);
    durableSet("xsnow.ideas", "[]", local);
    durableSet("xsnow.avatar", "", local);
    await boot;

    assert.equal(durableGet("xsnow.avatar", local), JSON.stringify("femme-noire"));
    assert.match(durableGet("xsnow.ideas", local) ?? "", /Prêter une perceuse/);
    assert.match(backup.get("xsnow.ideas") ?? "", /Prêter une perceuse/);
    assert.equal(backup.get("xsnow.avatar"), JSON.stringify("femme-noire"));
  });

  it("hydrates every xsnow.* backup key, not only the list passed in", async () => {
    const local = memoryStore();
    const backup = new Map<string, string>([
      ["xsnow.localProfile", JSON.stringify({ id: "OPC-7K3M" })],
      ["ignored", "nope"],
    ]);
    setDurableBackupForTests(backup);
    await hydrateDurableFromBackup([], local);
    assert.match(local.getItem("xsnow.localProfile") ?? "", /OPC-7K3M/);
    assert.equal(local.getItem("ignored"), null);
  });
});

describe("IndexedDB database name", () => {
  it("stays stable so returning visits reopen the same backup", () => {
    assert.equal(DURABLE_IDB_NAME, "xsnow-device-memory");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  durableGet,
  durableSet,
  ensureDurableHydration,
  hydrateDurableFromBackup,
  isDurableBootReady,
  isEmptyDurableValue,
  resetDurableMemoryForTests,
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

describe("durable restore rules", () => {
  it("treats blank local values as missing", () => {
    assert.equal(isEmptyDurableValue(null), true);
    assert.equal(isEmptyDurableValue(""), true);
    assert.equal(isEmptyDurableValue("null"), true);
    assert.equal(isEmptyDurableValue("undefined"), true);
    assert.equal(isEmptyDurableValue("  undefined  "), true);
    assert.equal(isEmptyDurableValue("[]"), false);
    assert.equal(shouldRestoreFromBackup(null, JSON.stringify("homme-blanc")), true);
    assert.equal(shouldRestoreFromBackup("", '{"id":"OPC-7K3M"}'), true);
    assert.equal(shouldRestoreFromBackup("null", '{"id":"OPC-7K3M"}'), true);
    assert.equal(shouldRestoreFromBackup("undefined", '{"id":"OPC-7K3M"}'), true);
    assert.equal(shouldRestoreFromBackup(JSON.stringify("femme-noire"), JSON.stringify("homme-blanc")), false);
  });

  it("restores a populated list when local was wiped to []", () => {
    const backup = JSON.stringify([{ id: "idea-1", text: "Déneiger" }]);
    assert.equal(shouldRestoreFromBackup("[]", backup), true);
    assert.equal(shouldRestoreFromBackup("[]", "[]"), false);
  });
});

describe("IndexedDB backup mirror", () => {
  it("does not let an empty boot write wipe a populated backup", () => {
    const local = memoryStore();
    const backup = new Map<string, string>();
    setDurableBackupForTests(backup);
    resetDurableMemoryForTests();
    try {
      durableSet("xsnow.avatar", JSON.stringify("homme-blanc"), local);
      durableSet("xsnow.localProfile", JSON.stringify({ id: "OPC-7K3M" }), local);
      assert.equal(backup.get("xsnow.avatar"), JSON.stringify("homme-blanc"));
      durableSet("xsnow.avatar", "", local);
      durableSet("xsnow.localProfile", "null", local);
      assert.equal(backup.get("xsnow.avatar"), JSON.stringify("homme-blanc"));
      assert.equal(backup.get("xsnow.localProfile"), JSON.stringify({ id: "OPC-7K3M" }));
    } finally {
      setDurableBackupForTests(null);
      resetDurableMemoryForTests();
    }
  });

  it("copies backup into empty localStorage, including settings keys", async () => {
    const local = memoryStore();
    const backup = new Map<string, string>([
      ["xsnow.avatar", JSON.stringify("femme-noire")],
      ["xsnow.localProfile", JSON.stringify({ id: "OPC-7K3M", firstName: "Marie" })],
      ["xsnow.lang", JSON.stringify("en")],
      ["xsnow.geoConsent", JSON.stringify("granted")],
      ["xsnow.analyticsConsent", JSON.stringify("denied")],
      ["xsnow.offers", JSON.stringify([{ id: "offer-1" }])],
    ]);
    setDurableBackupForTests(backup);
    resetDurableMemoryForTests();
    try {
      const restored = await hydrateDurableFromBackup(
        ["xsnow.avatar", "xsnow.localProfile", "xsnow.lang", "xsnow.geoConsent", "xsnow.analyticsConsent"],
        local,
      );
      assert.ok(restored >= 5);
      assert.equal(local.getItem("xsnow.avatar"), JSON.stringify("femme-noire"));
      assert.match(local.getItem("xsnow.localProfile") ?? "", /OPC-7K3M/);
      assert.equal(local.getItem("xsnow.lang"), JSON.stringify("en"));
      assert.equal(local.getItem("xsnow.geoConsent"), JSON.stringify("granted"));
      assert.equal(local.getItem("xsnow.analyticsConsent"), JSON.stringify("denied"));
      assert.match(local.getItem("xsnow.offers") ?? "", /offer-1/);
    } finally {
      setDurableBackupForTests(null);
      resetDurableMemoryForTests();
    }
  });

  it("backfills backup from localStorage when IndexedDB was never written", async () => {
    const local = memoryStore({
      "xsnow.avatar": JSON.stringify("homme-noir"),
    });
    const backup = new Map<string, string>();
    setDurableBackupForTests(backup);
    resetDurableMemoryForTests();
    try {
      const restored = await hydrateDurableFromBackup(["xsnow.avatar"], local);
      assert.equal(restored, 0);
      assert.equal(backup.get("xsnow.avatar"), JSON.stringify("homme-noir"));
    } finally {
      setDurableBackupForTests(null);
      resetDurableMemoryForTests();
    }
  });

  it("serves memory after restore even when localStorage writes throw", async () => {
    const backup = new Map<string, string>([["xsnow.avatar", JSON.stringify("homme-blanc")]]);
    setDurableBackupForTests(backup);
    resetDurableMemoryForTests();
    const previous = (globalThis as { window?: unknown }).window;
    const throwing = memoryStore();
    throwing.setItem = () => {
      throw new Error("quota");
    };
    (globalThis as { window: { localStorage: Storage } }).window = { localStorage: throwing };
    try {
      const restored = await hydrateDurableFromBackup(["xsnow.avatar"]);
      assert.equal(restored, 1);
      assert.equal(durableGet("xsnow.avatar"), JSON.stringify("homme-blanc"));
    } finally {
      setDurableBackupForTests(null);
      resetDurableMemoryForTests();
      if (previous === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = previous;
      }
    }
  });
});

describe("same-tab session fallback", () => {
  it("reads sessionStorage when localStorage is empty", () => {
    resetDurableMemoryForTests();
    const localData: Record<string, string> = {};
    const sessionData: Record<string, string> = {
      "xsnow.localProfile": JSON.stringify({ id: "OPC-7K3M" }),
    };
    const previous = (globalThis as { window?: unknown }).window;
    (globalThis as { window: { localStorage: Storage; sessionStorage: Storage } }).window = {
      localStorage: memoryStore(localData),
      sessionStorage: memoryStore(sessionData),
    };
    try {
      assert.equal(durableGet("xsnow.localProfile"), JSON.stringify({ id: "OPC-7K3M" }));
    } finally {
      resetDurableMemoryForTests();
      if (previous === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = previous;
      }
    }
  });
});

describe("boot restore race", () => {
  it("ensureDurableHydration copies backup and marks boot ready", async () => {
    const local = memoryStore();
    const backup = new Map<string, string>([
      ["xsnow.avatar", JSON.stringify("homme-blanc")],
      ["xsnow.localProfile", JSON.stringify({ id: "OPC-7K3M", firstName: "Marie" })],
    ]);
    setDurableBackupForTests(backup);
    resetDurableMemoryForTests();
    try {
      assert.equal(isDurableBootReady(), false);
      const restored = await ensureDurableHydration(["xsnow.avatar", "xsnow.localProfile"], local);
      assert.ok(restored >= 2);
      assert.equal(isDurableBootReady(), true);
      assert.equal(durableGet("xsnow.avatar", local), JSON.stringify("homme-blanc"));
      assert.match(durableGet("xsnow.localProfile", local) ?? "", /OPC-7K3M/);
    } finally {
      setDurableBackupForTests(null);
      resetDurableMemoryForTests();
    }
  });

  it("does not let an empty write during boot wipe a richer backup", async () => {
    const local = memoryStore();
    const backup = new Map<string, string>();
    setDurableBackupForTests(backup);
    resetDurableMemoryForTests();
    try {
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
    } finally {
      setDurableBackupForTests(null);
      resetDurableMemoryForTests();
    }
  });

  it("hydrates every xsnow.* backup key, not only the list passed in", async () => {
    const local = memoryStore();
    const backup = new Map<string, string>([
      ["xsnow.localProfile", JSON.stringify({ id: "OPC-7K3M" })],
      ["xsnow.offers", JSON.stringify([{ id: "offer-1" }])],
      ["ignored", "nope"],
    ]);
    setDurableBackupForTests(backup);
    resetDurableMemoryForTests();
    try {
      await hydrateDurableFromBackup([], local);
      assert.match(local.getItem("xsnow.localProfile") ?? "", /OPC-7K3M/);
      assert.match(local.getItem("xsnow.offers") ?? "", /offer-1/);
      assert.equal(local.getItem("ignored"), null);
    } finally {
      setDurableBackupForTests(null);
      resetDurableMemoryForTests();
    }
  });

});


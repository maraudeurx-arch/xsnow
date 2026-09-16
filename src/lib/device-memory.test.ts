import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ideaFromForm } from "./ideas.ts";
import {
  DEVICE_KEYS,
  DEVICE_MEMORY_VERSION,
  emptyDeviceMemory,
  hasPlayedWelcomeFor,
  markWelcomePlayed,
  migrateDeviceMemory,
  migrateWelcomePlayed,
  parseStoredAvatar,
  readDeviceMemory,
  readStoredAvatar,
  readStoredIdeas,
  restoreDeviceMemoryFromBackup,
  writeStoredAvatar,
  writeStoredIdeas,
} from "./device-memory.ts";
import {
  setDurableBackupForTests,
  shouldRestoreFromBackup,
  resetDurableMemoryForTests,
} from "./durable-storage.ts";
import { profileFromForm, readLocalProfile, writeLocalProfile } from "./local-profile.ts";

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

describe("device memory snapshot", () => {
  it("starts empty on a new device", () => {
    const store = memoryStore();
    assert.deepEqual(readDeviceMemory(store), emptyDeviceMemory());
    assert.equal(readStoredAvatar(store), null);
    assert.deepEqual(readStoredIdeas(store), []);
  });

  it("round-trips avatar, profile, and ideas without mixing devices", () => {
    const store = memoryStore();
    writeStoredAvatar("femme-noire", store);
    const profile = profileFromForm(
      {
        firstName: "Marie",
        lastName: "Tremblay",
        email: "marie@voisin.test",
        phone: "819-555-0100",
      },
      null,
      () => "2026-09-16T00:00:00.000Z",
      () => "OPC-7K3M",
    );
    assert.ok(profile);
    writeLocalProfile(profile, store);
    const idea = ideaFromForm({
      text: "Déneiger les allées le samedi",
      involvement: ["mains"],
      hoursPerWeek: "2",
      neighborhood: "Hull",
    });
    writeStoredIdeas([idea], store);

    const restored = readDeviceMemory(store);
    assert.equal(restored.avatar, "femme-noire");
    assert.equal(restored.profile?.id, "OPC-7K3M");
    assert.equal(restored.profile?.firstName, "Marie");
    assert.equal(restored.ideas.length, 1);
    assert.equal(restored.ideas[0]?.text, "Déneiger les allées le samedi");

    const other = memoryStore();
    assert.deepEqual(readDeviceMemory(other), emptyDeviceMemory());
    assert.equal(readLocalProfile(other), null);
  });

  it("parses avatar ids from JSON or a plain string", () => {
    assert.equal(parseStoredAvatar("homme-blanc"), "homme-blanc");
    assert.equal(parseStoredAvatar(JSON.stringify("femme-blanche")), "femme-blanche");
    assert.equal(parseStoredAvatar("not-an-avatar"), null);
    assert.equal(parseStoredAvatar("<script>"), null);
  });
});

describe("welcome-played migration", () => {
  it("copies sessionStorage into localStorage once and then stays durable", () => {
    const local = memoryStore();
    const session = memoryStore({
      [DEVICE_KEYS.welcomePlayed]: JSON.stringify(["homme-blanc"]),
    });
    const copied = migrateWelcomePlayed(local, session);
    assert.deepEqual(copied, ["homme-blanc"]);
    assert.equal(hasPlayedWelcomeFor("homme-blanc", local), true);

    session.setItem(DEVICE_KEYS.welcomePlayed, JSON.stringify(["femme-noire"]));
    migrateWelcomePlayed(local, session);
    assert.equal(hasPlayedWelcomeFor("femme-noire", local), false);
    assert.equal(hasPlayedWelcomeFor("homme-blanc", local), true);

    markWelcomePlayed("femme-noire", undefined, local);
    assert.equal(hasPlayedWelcomeFor("femme-noire", local), true);
  });

  it("stamps a memory version without seeding listings", () => {
    const store = memoryStore();
    migrateDeviceMemory(store, memoryStore());
    assert.equal(store.getItem(DEVICE_KEYS.version), String(DEVICE_MEMORY_VERSION));
    assert.deepEqual(readDeviceMemory(store), emptyDeviceMemory());
  });

  it("keeps language, place, and geo consent when stamping the version", () => {
    const store = memoryStore({
      [DEVICE_KEYS.lang]: JSON.stringify("en"),
      [DEVICE_KEYS.geoConsent]: JSON.stringify("granted"),
      [DEVICE_KEYS.place]: JSON.stringify({ label: "Hull", city: "Gatineau" }),
    });
    writeStoredAvatar("homme-noir", store);
    migrateDeviceMemory(store, memoryStore());
    assert.equal(store.getItem(DEVICE_KEYS.version), String(DEVICE_MEMORY_VERSION));
    assert.equal(readStoredAvatar(store), "homme-noir");
    assert.equal(store.getItem(DEVICE_KEYS.lang), JSON.stringify("en"));
    assert.equal(store.getItem(DEVICE_KEYS.geoConsent), JSON.stringify("granted"));
    assert.match(store.getItem(DEVICE_KEYS.place) ?? "", /Hull/);
  });
});

describe("standalone cold-start restore", () => {
  it("does not delete existing xsnow.* keys when migrating", () => {
    const store = memoryStore();
    writeStoredAvatar("femme-blanche", store);
    writeStoredIdeas(
      [
        ideaFromForm({
          text: "Déneiger les allées",
          involvement: ["mains"],
          hoursPerWeek: "1",
          neighborhood: "Hull",
        }),
      ],
      store,
    );
    const before = { ...store.data };
    migrateDeviceMemory(store, memoryStore());
    for (const key of Object.keys(before)) {
      assert.equal(store.getItem(key), before[key], key);
    }
    assert.equal(readStoredAvatar(store), "femme-blanche");
    assert.equal(readStoredIdeas(store).length, 1);
  });

  it("restores avatar, profile, and ideas from backup when localStorage is empty", async () => {
    const local = memoryStore();
    const backup = new Map<string, string>();
    setDurableBackupForTests(backup);
    try {
      writeStoredAvatar("homme-blanc", local);
      const profile = profileFromForm(
        {
          firstName: "Marie",
          lastName: "Tremblay",
          email: "marie@voisin.test",
          phone: "819-555-0100",
        },
        null,
        () => "2026-09-16T00:00:00.000Z",
        () => "OPC-7K3M",
      );
      assert.ok(profile);
      writeLocalProfile(profile, local);
      const idea = ideaFromForm({
        text: "Prêter une perceuse",
        involvement: ["mains"],
        hoursPerWeek: "1",
        neighborhood: "Hull",
      });
      writeStoredIdeas([idea], local);
      assert.equal(backup.get(DEVICE_KEYS.avatar), JSON.stringify("homme-blanc"));

      local.clear();
      assert.deepEqual(readDeviceMemory(local), emptyDeviceMemory());

      const restored = await restoreDeviceMemoryFromBackup(local);
      assert.ok(restored >= 3);
      const memory = readDeviceMemory(local);
      assert.equal(memory.avatar, "homme-blanc");
      assert.equal(memory.profile?.id, "OPC-7K3M");
      assert.equal(memory.profile?.email, "marie@voisin.test");
      assert.equal(memory.ideas[0]?.text, "Prêter une perceuse");
    } finally {
      setDurableBackupForTests(null);
      resetDurableMemoryForTests();
    }
  });

  it("restores a wiped ideas list from backup but keeps a newer avatar", async () => {
    const local = memoryStore();
    const backup = new Map<string, string>();
    setDurableBackupForTests(backup);
    try {
      writeStoredAvatar("homme-blanc", local);
      writeStoredIdeas(
        [
          ideaFromForm({
            text: "Ancienne idée",
            involvement: ["tete"],
            hoursPerWeek: "1",
            neighborhood: "",
          }),
        ],
        local,
      );
      writeStoredAvatar("femme-noire", local);
      local.setItem(DEVICE_KEYS.ideas, "[]");
      assert.equal(shouldRestoreFromBackup("[]", backup.get(DEVICE_KEYS.ideas) ?? null), true);
      await restoreDeviceMemoryFromBackup(local);
      assert.equal(readStoredAvatar(local), "femme-noire");
      assert.equal(readStoredIdeas(local)[0]?.text, "Ancienne idée");
    } finally {
      setDurableBackupForTests(null);
      resetDurableMemoryForTests();
    }
  });

  it("restores language and consents from backup with the profile", async () => {
    const local = memoryStore();
    const backup = new Map<string, string>();
    setDurableBackupForTests(backup);
    resetDurableMemoryForTests();
    try {
      local.setItem(DEVICE_KEYS.lang, JSON.stringify("en"));
      local.setItem(DEVICE_KEYS.geoConsent, JSON.stringify("granted"));
      local.setItem(DEVICE_KEYS.analyticsConsent, JSON.stringify("denied"));
      writeStoredAvatar("homme-blanc", local);
      await restoreDeviceMemoryFromBackup(local);
      local.clear();
      await restoreDeviceMemoryFromBackup(local);
      assert.equal(local.getItem(DEVICE_KEYS.lang), JSON.stringify("en"));
      assert.equal(local.getItem(DEVICE_KEYS.geoConsent), JSON.stringify("granted"));
      assert.equal(local.getItem(DEVICE_KEYS.analyticsConsent), JSON.stringify("denied"));
      assert.equal(readStoredAvatar(local), "homme-blanc");
    } finally {
      setDurableBackupForTests(null);
      resetDurableMemoryForTests();
    }
  });
});

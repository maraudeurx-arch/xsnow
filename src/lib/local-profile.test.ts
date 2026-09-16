import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HEADER_FIRST_NAME_MAX,
  LOCAL_PROFILE_KEY,
  OPC_ID_ALPHABET,
  OPC_ID_PREFIX,
  defaultRegisterShareBlurb,
  generateOpcMemberId,
  headerDisplayName,
  isOpcMemberId,
  parseStoredProfile,
  profileFormIssues,
  profileFromForm,
  profileInitials,
  readLocalProfile,
  sanitizePersonName,
  sanitizeProfileEmail,
  sanitizeProfilePhone,
  writeLocalProfile,
} from "./local-profile.ts";

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
  } as Storage;
}

function bytesFor(chars: string) {
  const bytes = new Uint8Array(chars.length);
  for (let i = 0; i < chars.length; i += 1) {
    const idx = OPC_ID_ALPHABET.indexOf(chars[i]!);
    bytes[i] = idx >= 0 ? idx : 0;
  }
  return bytes;
}

describe("OPC member id", () => {
  it("documents OPC-XXXX from the Crockford-like alphabet", () => {
    const id = generateOpcMemberId(() => bytesFor("7K3M"));
    assert.equal(id, "OPC-7K3M");
    assert.equal(isOpcMemberId(id), true);
    assert.equal(id.startsWith(OPC_ID_PREFIX), true);
    assert.equal(id.length, OPC_ID_PREFIX.length + 4);
    assert.equal(isOpcMemberId("opc-7k3m"), false);
    assert.equal(isOpcMemberId("OPC-7K3M!"), false);
    assert.equal(isOpcMemberId("OPC-IO01"), false);
    assert.equal(isOpcMemberId("<script>"), false);
  });

  it("retries when the first draw collides on-device", () => {
    let calls = 0;
    const id = generateOpcMemberId(
      () => {
        calls += 1;
        return calls === 1 ? bytesFor("7K3M") : bytesFor("AB23");
      },
      new Set(["OPC-7K3M"]),
    );
    assert.equal(id, "OPC-AB23");
    assert.equal(calls, 2);
  });

  it("never emits I, O, 0, or 1", () => {
    const seen = new Set<string>();
    for (let n = 0; n < 64; n += 1) {
      const id = generateOpcMemberId();
      assert.equal(isOpcMemberId(id), true);
      seen.add(id);
      assert.doesNotMatch(id.slice(4), /[IO01]/);
    }
    assert.ok(seen.size > 1);
  });
});

describe("display name and initials", () => {
  it("shows initials next to the logo", () => {
    assert.equal(
      headerDisplayName({ firstName: "Marie", lastName: "Tremblay", email: "marie@opc.test", phone: "819-555-0100" }),
      "M.T.",
    );
    assert.equal(profileInitials("Marie", "Tremblay"), "M.T.");
    assert.equal(profileInitials("politzer", "estigene"), "P.E.");
    assert.ok("Marie".length <= HEADER_FIRST_NAME_MAX);
  });

  it("keeps initials for long first names", () => {
    assert.equal(
      headerDisplayName({
        firstName: "Marie-Antoinette",
        lastName: "Dupont",
        email: "a@b.co",
        phone: "8195550100",
      }),
      "M.D.",
    );
    assert.equal(profileInitials("Élodie", "Ñunez"), "É.Ñ.");
    assert.equal(profileInitials("Ada", ""), "A.");
    assert.equal(profileInitials("", "Lovelace"), "L.");
    assert.equal(profileInitials("", ""), "");
  });

  it("never puts email or phone in the header label", () => {
    assert.equal(
      headerDisplayName({
        firstName: "ada@example.com",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "819-555-0199",
      }),
      "L.",
    );
    assert.equal(
      headerDisplayName({
        firstName: "819-555-0199",
        lastName: "Marie",
        email: "x@y.co",
        phone: "819-555-0199",
      }),
      "M.",
    );
    const label = headerDisplayName({
      firstName: "Paul",
      lastName: "Émile",
      email: "paul.emile@example.com",
      phone: "+1 819 555 0100",
    });
    assert.equal(label, "P.É.");
    assert.doesNotMatch(label, /@/);
    assert.doesNotMatch(label, /819/);
  });
});

describe("profile field sanitize", () => {
  it("keeps ordinary names and strips HTML/JS", () => {
    assert.equal(sanitizePersonName("Marie-Ève"), "Marie-Ève");
    assert.equal(sanitizePersonName("<script>alert(1)</script>Marie"), "Marie");
    assert.doesNotMatch(sanitizePersonName('<img src=x onerror="alert(1)">Ada'), /onerror|<img/i);
    assert.doesNotMatch(sanitizePersonName("javascript:alert(1) Ada"), /javascript:/i);
    assert.match(sanitizePersonName("javascript:alert(1) Ada"), /Ada/);
    assert.equal(sanitizePersonName("ada@example.com"), "");
    assert.equal(sanitizePersonName("a".repeat(80)).length, 40);
  });

  it("accepts a real email and rejects schemes / tags", () => {
    assert.equal(sanitizeProfileEmail("Ada.Lovelace@Example.COM"), "ada.lovelace@example.com");
    assert.equal(sanitizeProfileEmail("javascript:alert(1)@x.com"), "");
    assert.equal(sanitizeProfileEmail("<script>x@y.co</script>"), "");
    assert.equal(sanitizeProfileEmail("not-an-email"), "");
    assert.equal(sanitizeProfileEmail(""), "");
  });

  it("keeps a neighbour phone and drops junk", () => {
    assert.equal(sanitizeProfilePhone("819-555-0100"), "819-555-0100");
    assert.equal(sanitizeProfilePhone("+1 (819) 555-0100"), "+1 (819) 555-0100");
    assert.equal(sanitizeProfilePhone("<script>alert(1)</script>8195550100"), "8195550100");
    assert.equal(sanitizeProfilePhone("123"), "");
    assert.equal(sanitizeProfilePhone("javascript:alert(1)"), "");
  });
});

describe("profile form and storage", () => {
  it("requires all four fields and keeps a stable id on edit", () => {
    const issues = profileFormIssues({
      firstName: "",
      lastName: "Tremblay",
      email: "bad",
      phone: "12",
    });
    assert.deepEqual(issues, ["firstName", "email", "phone"]);

    const created = profileFromForm(
      {
        firstName: "Marie",
        lastName: "Tremblay",
        email: "marie@opc.test",
        phone: "819-555-0100",
      },
      null,
      () => "2026-09-16T00:00:00.000Z",
      () => "OPC-7K3M",
    );
    assert.ok(created);
    assert.equal(created.id, "OPC-7K3M");
    assert.equal(created.firstName, "Marie");

    const edited = profileFromForm(
      {
        firstName: "Marie-Ève",
        lastName: "Tremblay",
        email: "marie@opc.test",
        phone: "819-555-0100",
      },
      created,
      () => "2026-09-16T12:00:00.000Z",
      () => "OPC-ZZZZ",
    );
    assert.equal(edited?.id, "OPC-7K3M");
    assert.equal(edited?.createdAt, created.createdAt);
    assert.equal(edited?.firstName, "Marie-Ève");
  });

  it("round-trips through localStorage and drops XSS payloads", () => {
    const store = memoryStore();
    const profile = profileFromForm(
      {
        firstName: "<script>alert(1)</script>Marie",
        lastName: "Tremblay",
        email: "marie@opc.test",
        phone: "8195550100",
      },
      null,
      () => "2026-09-16T00:00:00.000Z",
      () => "OPC-AB23",
    );
    assert.ok(profile);
    writeLocalProfile(profile, store);
    const raw = store.getItem(LOCAL_PROFILE_KEY) ?? "";
    assert.doesNotMatch(raw, /<script/i);
    const read = readLocalProfile(store);
    assert.equal(read?.id, "OPC-AB23");
    assert.equal(read?.firstName, "Marie");
    assert.equal(parseStoredProfile({ id: "nope", firstName: "A", lastName: "B", email: "a@b.co", phone: "8195550100" }), null);
  });

  it("builds a share blurb without email or phone", () => {
    const url = "https://maraudeurx-arch.github.io/xsnow/?invite=opc-ab12";
    const fr = defaultRegisterShareBlurb(url, "Marie", "fr");
    assert.match(fr, /Marie t’invite/);
    assert.match(fr, /invite=opc-ab12/);
    assert.doesNotMatch(fr, /@/);
    assert.doesNotMatch(fr, /555/);
    assert.match(defaultRegisterShareBlurb(url, "Marie", "en"), /invites you/);
    assert.match(defaultRegisterShareBlurb(url, "Marie", "es"), /te invita/);
  });
});

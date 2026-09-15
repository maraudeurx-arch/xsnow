import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AVATAR_RINGS, AVATARS, avatarById } from "./avatars.ts";

describe("avatar rings", () => {
  it("gives each of the four avatars a unique gender-matched ring", () => {
    assert.equal(AVATARS.length, 4);
    const rings = AVATARS.map((avatar) => avatar.ring);
    assert.equal(new Set(rings).size, 4);

    const maleRings = AVATARS.filter((avatar) => avatar.gender === "male").map(
      (avatar) => avatar.ring,
    );
    const femaleRings = AVATARS.filter((avatar) => avatar.gender === "female").map(
      (avatar) => avatar.ring,
    );

    assert.deepEqual(new Set(maleRings), new Set(["green", "blue"]));
    assert.deepEqual(new Set(femaleRings), new Set(["pink", "yellow"]));
  });

  it("maps homme-blanc/homme-noir to green/blue and women to pink/yellow", () => {
    assert.equal(avatarById("homme-blanc").ring, "green");
    assert.equal(avatarById("homme-noir").ring, "blue");
    assert.equal(avatarById("femme-blanche").ring, "pink");
    assert.equal(avatarById("femme-noire").ring, "yellow");

    assert.equal(AVATAR_RINGS.green, "#3dff8a");
    assert.equal(AVATAR_RINGS.blue, "#3db8ff");
    assert.equal(AVATAR_RINGS.pink, "#ff6bb5");
    assert.equal(AVATAR_RINGS.yellow, "#ffe14d");
  });

  it("keeps speech gender metadata unchanged", () => {
    assert.equal(avatarById("homme-blanc").gender, "male");
    assert.equal(avatarById("homme-noir").gender, "male");
    assert.equal(avatarById("femme-blanche").gender, "female");
    assert.equal(avatarById("femme-noire").gender, "female");
  });
});

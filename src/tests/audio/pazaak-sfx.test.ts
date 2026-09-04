/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { pazaakSetOrMatchSfx } from "@/engine/minigames/pazaak-sfx";

describe("Pass AJ Pazaak SFX (DoGameSequence)", () => {
  it("player set win before target → mgs_winset", () => {
    expect(pazaakSetOrMatchSfx("player", 1, 3)).toBe("mgs_winset");
    expect(pazaakSetOrMatchSfx("player", 2, 3)).toBe("mgs_winset");
  });

  it("player match win at target → mgs_winmatch", () => {
    expect(pazaakSetOrMatchSfx("player", 3, 3)).toBe("mgs_winmatch");
  });

  it("opponent set / match → loseset / losematch", () => {
    expect(pazaakSetOrMatchSfx("opponent", 1, 3)).toBe("mgs_loseset");
    expect(pazaakSetOrMatchSfx("opponent", 3, 3)).toBe("mgs_losematch");
  });
});

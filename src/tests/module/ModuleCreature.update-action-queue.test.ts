/**
 * updateActionQueue must tick while debilitated (RunActions).
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as fs from "fs";
import { srcPath } from "@/tests/helpers/paths";

describe("ModuleCreature.updateActionQueue", () => {
  it("does not early-return on isDebilitated (k_ptar_calofade Wait/Resume)", () => {
    const src = fs.readFileSync(
      srcPath("module", "ModuleCreature.ts"),
      "utf8"
    );
    const start = src.indexOf("  updateActionQueue(delta = 0){");
    expect(start).toBeGreaterThan(-1);
    const fn = src.slice(start, start + 800);
    expect(fn).not.toMatch(/isDebilitated\s*\(/);
    expect(fn).toMatch(/this\.actionQueue\.process/);
  });
});

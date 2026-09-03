/**
 * updateActionQueue must tick while debilitated (retail RunActions).
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";

describe("ModuleCreature.updateActionQueue", () => {
  it("does not early-return on isDebilitated (k_ptar_calofade Wait/Resume)", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "ModuleCreature.ts"),
      "utf8"
    );
    const start = src.indexOf("  updateActionQueue(delta = 0){");
    expect(start).toBeGreaterThan(-1);
    const fn = src.slice(start, start + 800);
    expect(fn).not.toMatch(/isDebilitated\s*\(/);
    expect(fn).toMatch(/this\.actionQueue\.process/);
  });
});

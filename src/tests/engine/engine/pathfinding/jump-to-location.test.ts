/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  classifyJumpDestination,
  isAreaLike,
  jumpFacingFromOrientation,
} from "@engine/movement/jump-to-location";

function mockArea(id: number, filename?: string) {
  return {
    id,
    creatures: [],
    attachObject: () => {},
    module: filename ? { filename } : undefined,
  };
}

describe("Pass AI classifyJumpDestination", () => {
  it("same area → same", () => {
    const a = mockArea(1, "end_m01aa") as any;
    expect(classifyJumpDestination(a, a, "end_m01aa").kind).toBe("same");
  });

  it("missing dest → same (use owner)", () => {
    const a = mockArea(1, "end_m01aa") as any;
    const r = classifyJumpDestination(a, null, "end_m01aa");
    expect(r.kind).toBe("same");
    expect(r.area).toBe(a);
  });

  it("different area same module → reattach", () => {
    const a = mockArea(1, "tar_m02aa") as any;
    const b = mockArea(2, "tar_m02aa") as any;
    expect(classifyJumpDestination(a, b, "tar_m02aa").kind).toBe("reattach");
    expect(classifyJumpDestination(a, b, "tar_m02aa").area).toBe(b);
  });

  it("different module filename → loadModule", () => {
    const a = mockArea(1, "end_m01aa") as any;
    const b = mockArea(2, "tar_m02aa") as any;
    const r = classifyJumpDestination(a, b, "end_m01aa");
    expect(r.kind).toBe("loadModule");
    expect(r.moduleName).toBe("tar_m02aa");
  });

  it("isAreaLike detects attachObject + creatures", () => {
    expect(isAreaLike(mockArea(1))).toBe(true);
    expect(isAreaLike({})).toBe(false);
    expect(isAreaLike(null)).toBe(false);
  });

  it("jumpFacingFromOrientation matches atan2 convention", () => {
    expect(jumpFacingFromOrientation(0, 1)).toBeCloseTo(0, 5);
    expect(jumpFacingFromOrientation(1, 0)).toBeCloseTo(-Math.PI / 2, 5);
  });

  it("orientation ↔ facing roundtrip matches creature forward (−sin, cos)", () => {
    // EngineLocation.setFacing / getRotationFromBearing / getCreatureForwardXY
    const orientationFromFacing = (theta: number) => ({
      ox: -Math.sin(theta),
      oy: Math.cos(theta),
    });

    for (const theta of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 2.552]) {
      const { ox, oy } = orientationFromFacing(theta);
      expect(jumpFacingFromOrientation(ox, oy)).toBeCloseTo(theta, 5);
    }
  });

  it("101per WP_player_start GetLocation→Jump preserves GIT facing", () => {
    // exports/k2/module/101per/git — WP_player_start
    const ox = -0.5555790662765503;
    const oy = -0.8314636945724487;
    const facing = jumpFacingFromOrientation(ox, oy);
    // Old getRotationFromBearing used (cos, sin) → ≈ −90° error after jump
    const wrongOx = Math.cos(facing);
    const wrongOy = Math.sin(facing);
    expect(jumpFacingFromOrientation(wrongOx, wrongOy)).not.toBeCloseTo(facing, 1);

    const rightOx = -Math.sin(facing);
    const rightOy = Math.cos(facing);
    expect(rightOx).toBeCloseTo(ox, 5);
    expect(rightOy).toBeCloseTo(oy, 5);
    expect(jumpFacingFromOrientation(rightOx, rightOy)).toBeCloseTo(facing, 5);
  });
});

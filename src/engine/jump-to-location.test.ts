/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  classifyJumpDestination,
  isAreaLike,
  jumpFacingFromOrientation,
} from "@/engine/jump-to-location";

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
});

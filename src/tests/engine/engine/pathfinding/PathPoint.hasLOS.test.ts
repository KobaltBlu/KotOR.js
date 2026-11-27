/**
 * PathPoint.hasLOS uses thin PTH clearance (creatures + static door/placeable).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const mockIsPthThinLineClear = jest.fn(() => true);

jest.mock("@engine/pathfinding/pth-edge-clear", () => ({
  isPthThinLineClear: (...args: unknown[]) => mockIsPthThinLineClear(...args),
}));

import { PathPoint } from "@engine/pathfinding/PathPoint";

describe("PathPoint.hasLOS", () => {
  beforeEach(() => {
    mockIsPthThinLineClear.mockReset();
    mockIsPthThinLineClear.mockReturnValue(true);
  });

  it("rejects when thin PTH LOS fails", () => {
    mockIsPthThinLineClear.mockReturnValue(false);
    const a = PathPoint.FromVector3(new THREE.Vector3(0, 0, 0));
    const b = PathPoint.FromVector3(new THREE.Vector3(2, 0, 0));
    a.area = {} as any;
    b.area = a.area;
    expect(a.hasLOS(b)).toBe(false);
    expect(mockIsPthThinLineClear).toHaveBeenCalled();
  });

  it("accepts when thin PTH LOS succeeds", () => {
    const a = PathPoint.FromVector3(new THREE.Vector3(0, 0, 0));
    const b = PathPoint.FromVector3(new THREE.Vector3(2, 0, 0));
    a.area = {} as any;
    expect(a.hasLOS(b)).toBe(true);
  });

  it("returns true when area is missing", () => {
    const a = PathPoint.FromVector3(new THREE.Vector3(0, 0, 0));
    const b = PathPoint.FromVector3(new THREE.Vector3(2, 0, 0));
    expect(a.hasLOS(b)).toBe(true);
    expect(mockIsPthThinLineClear).not.toHaveBeenCalled();
  });
});

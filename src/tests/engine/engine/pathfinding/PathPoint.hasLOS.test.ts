/**
 * PathPoint.hasLOS must reject NonWalk face voids, not only wall edges.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const mockIsWalkmeshEdgeWalkClear = jest.fn(() => true);
const mockIsCreatureCapsuleClear = jest.fn(() => ({ clear: true }));

jest.mock("@engine/pathfinding/path-hops-clear", () => ({
  isWalkmeshEdgeWalkClear: (...args: unknown[]) =>
    mockIsWalkmeshEdgeWalkClear(...args),
}));

jest.mock("@engine/pathfinding/creature-capsule-clear", () => ({
  isCreatureCapsuleClear: (...args: unknown[]) =>
    mockIsCreatureCapsuleClear(...args),
}));

import { PathPoint } from "@engine/pathfinding/PathPoint";

describe("PathPoint.hasLOS", () => {
  beforeEach(() => {
    mockIsWalkmeshEdgeWalkClear.mockReset();
    mockIsCreatureCapsuleClear.mockReset();
    mockIsWalkmeshEdgeWalkClear.mockReturnValue(true);
    mockIsCreatureCapsuleClear.mockReturnValue({ clear: true });
  });

  it("rejects when the chord is not walkmesh-clear", () => {
    mockIsWalkmeshEdgeWalkClear.mockReturnValue(false);
    const a = PathPoint.FromVector3(new THREE.Vector3(0, 0, 0));
    const b = PathPoint.FromVector3(new THREE.Vector3(2, 0, 0));
    a.area = {} as any;
    b.area = a.area;
    expect(a.hasLOS(b)).toBe(false);
    expect(mockIsWalkmeshEdgeWalkClear).toHaveBeenCalled();
  });

  it("rejects when a creature capsule blocks after walkmesh clear", () => {
    mockIsWalkmeshEdgeWalkClear.mockReturnValue(true);
    mockIsCreatureCapsuleClear.mockReturnValue({ clear: false });
    const a = PathPoint.FromVector3(new THREE.Vector3(0, 0, 0));
    const b = PathPoint.FromVector3(new THREE.Vector3(2, 0, 0));
    a.area = {} as any;
    expect(a.hasLOS(b)).toBe(false);
  });

  it("accepts walkmesh-clear chords with clear creatures", () => {
    const a = PathPoint.FromVector3(new THREE.Vector3(0, 0, 0));
    const b = PathPoint.FromVector3(new THREE.Vector3(2, 0, 0));
    a.area = {} as any;
    expect(a.hasLOS(b)).toBe(true);
  });
});

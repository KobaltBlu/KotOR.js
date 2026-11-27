/**
 * Thin PTH edge clearance + static edge table.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const mockStaticDetailed = jest.fn(() => ({ clear: true as boolean, blockingObjectId: undefined as number | undefined }));
const mockCapsule = jest.fn(() => ({ clear: true }));
const mockGetObjectById = jest.fn(() => undefined);

jest.mock("@engine/pathfinding/static-walk-blockers", () => ({
  isStaticWalkClearDetailed: (...args: unknown[]) => mockStaticDetailed(...args),
}));

jest.mock("@engine/pathfinding/creature-capsule-clear", () => ({
  isCreatureCapsuleClear: (...args: unknown[]) => mockCapsule(...args),
}));

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    GameObjectManager: { GetObjectById: (...args: unknown[]) => mockGetObjectById(...args) },
    PartyManager: { party: [] },
  },
}));

jest.mock("@engine/pathfinding/pth-edge-block", () => ({
  isPthEdgeBlockedByObject: (obj: { static?: boolean } | null | undefined) => {
    if(!obj) return false;
    if((obj as { placeable?: boolean }).placeable) return true;
    return !!(obj as { static?: boolean }).static;
  },
}));

import { PathPoint } from "@engine/pathfinding/PathPoint";
import {
  ensurePthStaticEdgeTable,
  invalidatePthStaticEdgeTable,
  isPthStaticEdgeBlocked,
  isPthStaticEdgeBlockedLive,
  isPthThinLineClear,
  pthEdgeKey,
} from "@engine/pathfinding/pth-edge-clear";
import { getPthStaticEdgeTable } from "@engine/pathfinding/pth-static-edge-table";

describe("pth-edge-clear", () => {
  beforeEach(() => {
    mockStaticDetailed.mockReset();
    mockCapsule.mockReset();
    mockGetObjectById.mockReset();
    mockStaticDetailed.mockReturnValue({ clear: true, blockingObjectId: undefined });
    mockCapsule.mockReturnValue({ clear: true });
    mockGetObjectById.mockReturnValue(undefined);
  });

  it("pthEdgeKey is undirected", () => {
    expect(pthEdgeKey(1, 2)).toBe(pthEdgeKey(2, 1));
  });

  it("isPthStaticEdgeBlockedLive uses skipMesh static detailed", () => {
    const area = {} as any;
    const a = new THREE.Vector3(0, 0, 0);
    const b = new THREE.Vector3(1, 0, 0);
    expect(isPthStaticEdgeBlockedLive(area, a, b)).toBe(false);
    expect(mockStaticDetailed).toHaveBeenCalledWith(
      area,
      a,
      b,
      expect.objectContaining({ personalSpace: 0, skipMesh: true })
    );
  });

  it("isPthStaticEdgeBlockedLive returns true for static door blocker", () => {
    mockStaticDetailed.mockReturnValue({ clear: false, blockingObjectId: 9 });
    mockGetObjectById.mockReturnValue({ static: true });
    const area = {} as any;
    expect(
      isPthStaticEdgeBlockedLive(area, new THREE.Vector3(), new THREE.Vector3(1, 0, 0))
    ).toBe(true);
  });

  it("ensurePthStaticEdgeTable caches undirected edges and invalidates", () => {
    const a = PathPoint.FromVector3(new THREE.Vector3(0, 0, 0));
    const b = PathPoint.FromVector3(new THREE.Vector3(2, 0, 0));
    a.id = 0;
    b.id = 1;
    a.isTemp = false;
    b.isTemp = false;
    a.addConnection(b);
    const area = { path: { points: [a, b] } } as any;
    a.area = area;
    b.area = area;

    mockStaticDetailed.mockReturnValue({ clear: false, blockingObjectId: 1 });
    mockGetObjectById.mockReturnValue({ placeable: true });

    const table = ensurePthStaticEdgeTable(area, [a, b]);
    expect(table.get(pthEdgeKey(0, 1))).toBe(true);
    expect(mockStaticDetailed).toHaveBeenCalledTimes(1);

    // Second ensure reuses table — no extra static probes.
    ensurePthStaticEdgeTable(area, [a, b]);
    expect(mockStaticDetailed).toHaveBeenCalledTimes(1);

    invalidatePthStaticEdgeTable(area);
    expect(getPthStaticEdgeTable(area)).toBeUndefined();
  });

  it("isPthStaticEdgeBlocked uses table for authored points", () => {
    const a = PathPoint.FromVector3(new THREE.Vector3(0, 0, 0));
    const b = PathPoint.FromVector3(new THREE.Vector3(2, 0, 0));
    a.id = 3;
    b.id = 4;
    a.isTemp = false;
    b.isTemp = false;
    a.addConnection(b);
    const area = { path: { points: [a, b] } } as any;
    a.area = area;
    b.area = area;
    mockStaticDetailed.mockReturnValue({ clear: true, blockingObjectId: undefined });
    ensurePthStaticEdgeTable(area, [a, b]);
    mockStaticDetailed.mockClear();
    expect(isPthStaticEdgeBlocked(area, a, b)).toBe(false);
    expect(mockStaticDetailed).not.toHaveBeenCalled();
  });

  it("isPthThinLineClear fails on creature capsule", () => {
    mockCapsule.mockReturnValue({ clear: false });
    const area = {} as any;
    expect(
      isPthThinLineClear(area, new THREE.Vector3(), new THREE.Vector3(1, 0, 0))
    ).toBe(false);
  });
});

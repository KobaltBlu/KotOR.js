/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const noNonWalkMock = jest.fn();

jest.mock("@/GameState", () => ({
  GameState: {
    ModuleObjectManager: { GetObjectById: () => undefined },
    module: undefined,
  },
}));

jest.mock("@/engine/pathfinding/static-walk-blockers", () => ({
  isStaticWalkClearDetailed: (...args: unknown[]) => noNonWalkMock(...args),
}));

jest.mock("@/engine/pathfinding/clipped-line-segment", () => ({
  clippedLineSegmentWalkable: () => ({
    ok: true,
    clearPoint: new THREE.Vector3(),
    clearT: 1,
  }),
}));

jest.mock("@/engine/pathfinding/creature-capsule-clear", () => ({
  isCreatureCapsuleClear: () => ({ clear: true }),
}));

import {
  farthestClearPoint,
  WalkLineHitCode,
  hasWalkLineClear,
} from "@/engine/pathfinding/walk-line-clear";
import type { ModuleArea } from "@/module/ModuleArea";

describe("hasWalkLineClear DetailedBlock clearT", () => {
  beforeEach(() => {
    noNonWalkMock.mockReset();
  });

  it("reports farthest clear fraction when static object blocks near dest", () => {
    // Clear for any segment ending at x < 9; blocks once endpoint reaches x >= 9.
    noNonWalkMock.mockImplementation(
      (_area: unknown, from: THREE.Vector3, to: THREE.Vector3) => {
        void from;
        return { clear: to.x < 9 };
      }
    );

    const area = {
      walkFaces: [],
      rooms: [],
      isPointWalkable: () => true,
    } as unknown as ModuleArea;
    const origin = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(10, 0, 0);

    const hit = hasWalkLineClear(area, origin, dest, {
      personalSpace: 0.5,
      checkCreatures: false,
      skipRoomCheck: true,
      skipClippedLine: false,
    });

    expect(hit.ok).toBe(false);
    expect(hit.code).toBe(WalkLineHitCode.DetailedBlock);
    expect(hit.clearT).toBeGreaterThan(0.85);
    expect(hit.clearT).toBeLessThan(0.95);
    expect(hit.clearPoint.x).toBeGreaterThan(8.5);
    expect(hit.clearPoint.x).toBeLessThan(9.0);

    const clear = farthestClearPoint(area, origin, dest, {
      personalSpace: 0.5,
      checkCreatures: false,
    });
    expect(clear.x).toBeGreaterThan(8.5);
    expect(clear.distanceToSquared(origin)).toBeGreaterThan(1);
  });

  it("empty candidate faces fall through to isPointWalkable (drive strip)", () => {
    noNonWalkMock.mockReturnValue({ clear: true });

    const area = {
      walkFaces: [{ pointInFace2d: () => true }],
      rooms: [],
      walkEdges: [],
      isPointWalkable: () => true,
      // Simulates VIS cull miss: box query returns no faces
      getWalkCandidatesForBox: (
        _box: unknown,
        out: { faces: unknown[]; edges: unknown[]; rooms: unknown[] }
      ) => {
        out.faces.length = 0;
        out.edges.length = 0;
        out.rooms.length = 0;
        return out;
      },
    } as unknown as ModuleArea;

    const origin = new THREE.Vector3(92, 78.24, 0);
    const dest = new THREE.Vector3(92, 77.9, 0);
    const hit = hasWalkLineClear(area, origin, dest, {
      personalSpace: 0.4,
      checkCreatures: false,
      skipRoomCheck: true,
      skipClippedLine: true,
    });

    expect(hit.ok).toBe(true);
    expect(hit.code).toBe(WalkLineHitCode.Ok);
  });

  it("passes onlyObjectId into refine mid-samples when blockingObjectId is known", () => {
    const blockerId = 42;
    noNonWalkMock.mockImplementation(
      (
        _area: unknown,
        _from: THREE.Vector3,
        to: THREE.Vector3,
        opts?: { onlyObjectId?: number; meshOnly?: boolean }
      ) => {
        // Initial full scan blocks with an id.
        if(opts?.onlyObjectId == null && opts?.meshOnly !== true && to.x >= 9.9){
          return { clear: false, blockingObjectId: blockerId };
        }
        // Scoped refine: only respond to the known blocker.
        if(opts?.onlyObjectId === blockerId){
          return { clear: to.x < 9 };
        }
        // Verify / other: clear when endpoint short of block.
        return { clear: to.x < 9 };
      }
    );

    const area = {
      walkFaces: [],
      rooms: [],
      isPointWalkable: () => true,
    } as unknown as ModuleArea;
    const origin = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(10, 0, 0);

    const hit = hasWalkLineClear(area, origin, dest, {
      personalSpace: 0.5,
      checkCreatures: false,
      skipRoomCheck: true,
      skipClippedLine: false,
    });

    expect(hit.ok).toBe(false);
    expect(hit.code).toBe(WalkLineHitCode.DetailedBlock);
    expect(hit.blockingObjectId).toBe(blockerId);
    expect(hit.clearT).toBeGreaterThan(0.85);

    const scopedCalls = noNonWalkMock.mock.calls.filter(
      (c) => (c[3] as { onlyObjectId?: number } | undefined)?.onlyObjectId === blockerId
    );
    expect(scopedCalls.length).toBe(10);
  });
});

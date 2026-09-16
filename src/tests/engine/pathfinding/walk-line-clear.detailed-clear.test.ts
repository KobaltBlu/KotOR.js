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
});

/**
 * find away vector walk-line clear / hasWalkLineClear clip (G8).
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

const hasWalkLineClearMock = jest.fn();
const farthestClearPointMock = jest.fn();

jest.mock("@engine/pathfinding/walk-line-clear", () => ({
  WalkLineHitCode: { Ok: 1, NonWalk: 2, Creature: -3 },
  hasWalkLineClear: (...args: unknown[]) => hasWalkLineClearMock(...args),
  farthestClearPoint: (...args: unknown[]) => farthestClearPointMock(...args),
}));

import { findAwayVector } from "@engine/pathfinding/find-away-vector";
import type { Creature } from "@engine/module/Creature";

describe("findAwayVector (G8)", () => {
  it("clips candidates via walk-line clear / hasWalkLineClear / farthestClearPoint", () => {
    hasWalkLineClearMock.mockReturnValue({
      ok: false,
      code: 2,
      clearT: 0.4,
      clearPoint: new THREE.Vector3(1, 0, 0),
    });
    farthestClearPointMock.mockImplementation(
      (_a: unknown, origin: THREE.Vector3, ideal: THREE.Vector3) => {
        const t = 0.4;
        return new THREE.Vector3(
          origin.x + (ideal.x - origin.x) * t,
          origin.y + (ideal.y - origin.y) * t,
          0
        );
      }
    );

    const creature = {
      position: new THREE.Vector3(0, 0, 0),
      area: {
        isPointWalkable: () => true,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      },
    } as unknown as Creature;

    const dest = findAwayVector(creature, new THREE.Vector3(5, 0, 0), 4);
    expect(hasWalkLineClearMock).toHaveBeenCalled();
    expect(farthestClearPointMock).toHaveBeenCalled();
    // Clipped length should be shorter than unclipped ideal (~4)
    const len = Math.hypot(dest.x, dest.y);
    expect(len).toBeLessThan(3.5);
  });
});

/**
 * ComputeAwayVector TestDirectLine clip (G8).
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

const testDirectLineMock = jest.fn();
const farthestClearPointMock = jest.fn();

jest.mock("@/engine/pathfinding/test-direct-line", () => ({
  TestDirectLineCode: { Ok: 1, NonWalk: 2, Creature: -3 },
  testDirectLine: (...args: unknown[]) => testDirectLineMock(...args),
  farthestClearPoint: (...args: unknown[]) => farthestClearPointMock(...args),
}));

import { computeAwayVector } from "@/engine/pathfinding/compute-away-vector";
import type { ModuleCreature } from "@/module/ModuleCreature";

describe("computeAwayVector (G8)", () => {
  it("clips candidates via TestDirectLine / farthestClearPoint", () => {
    testDirectLineMock.mockReturnValue({
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
    } as unknown as ModuleCreature;

    const dest = computeAwayVector(creature, new THREE.Vector3(5, 0, 0), 4);
    expect(testDirectLineMock).toHaveBeenCalled();
    expect(farthestClearPointMock).toHaveBeenCalled();
    // Clipped length should be shorter than unclipped ideal (~4)
    const len = Math.hypot(dest.x, dest.y);
    expect(len).toBeLessThan(3.5);
  });
});

/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    GameObjectManager: { GetObjectById: () => undefined },
    module: undefined,
  },
}));

jest.mock("@engine/pathfinding/walk-line-clear", () => ({
  hasClearWalkLine: () => true,
}));

import { PathPoint } from "@engine/pathfinding/PathPoint";
import { smoothCornerOptimizeRestartable } from "@engine/pathfinding/smooth-corner-optimize";

describe("smoothCornerOptimizeRestartable", () => {
  function sharpPolyline(): PathPoint[] {
    // Sharp right-angle corners so the loop has work
    const coords = [
      [0, 0],
      [5, 0],
      [5, 5],
      [10, 5],
      [10, 10],
      [15, 10],
    ];
    return coords.map(([x, y]) => PathPoint.FromVector3(new THREE.Vector3(x, y, 0)));
  }

  it("zero-budget abort then resume completes", () => {
    const pts = sharpPolyline();
    const area = {} as any;

    const full = smoothCornerOptimizeRestartable(area, pts, undefined, {
      timeBudgetMs: 1e9,
    });
    expect(full.timedOut).toBe(false);

    const first = smoothCornerOptimizeRestartable(area, pts, undefined, {
      timeBudgetMs: 0,
    });
    expect(first.timedOut).toBe(true);
    expect(first.resume).toBeDefined();
    expect(first.resume!.cornerIndex).toBeGreaterThanOrEqual(1);

    const second = smoothCornerOptimizeRestartable(area, pts, undefined, {
      timeBudgetMs: 1e9,
      resume: first.resume,
    });
    expect(second.timedOut).toBe(false);
    expect(second.points.length).toBe(full.points.length);
  });
});

/**
 * Retail CSWSArea::ClosestPathPoint: an endpoint joins the PTH graph at the
 * nearest node whose straight line passes the walkmesh test — not the raw
 * nearest node (live end_m01ab: PTH 6 sat across a NonWalk console, so the
 * planned first hop cut through it, buildWalkPath failed every tick and the
 * player never moved to its attack target).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const walkClear = jest.fn<(area: unknown, from: THREE.Vector3, to: THREE.Vector3) => boolean>();

jest.mock("@engine/runtime/GameState", () => ({ GameState: {} }));
jest.mock("@engine/pathfinding/path-hops-clear", () => ({
  isWalkmeshEdgeWalkClear: (area: unknown, from: THREE.Vector3, to: THREE.Vector3) =>
    walkClear(area, from, to),
}));

import { AreaPath } from "@engine/module/area/AreaPath";

function node(x: number, y: number){
  return { vector: new THREE.Vector3(x, y, 0) };
}

describe("AreaPath.getClosestReachablePathPoint", () => {
  beforeEach(() => walkClear.mockReset());

  it("skips a nearer node behind NonWalk and picks the nearest reachable one", () => {
    const across = node(76.05, 72.86); // 4.04 away
    const nearest = node(80.25, 72.52); // 2.51 away, line blocked
    const reachable = node(80.26, 78.13); // 3.30 away, line clear
    const ctx = { points: [across, nearest, reachable], area: {} };
    walkClear.mockImplementation((_a, _f, to) => to === reachable.vector);
    const got = AreaPath.prototype.getClosestReachablePathPoint.call(
      ctx,
      new THREE.Vector3(79.52, 74.92, 0)
    );
    expect(got).toBe(reachable);
    // Nearest-first: tested 2.51 then 3.30, stopped before the 4.04 node.
    expect(walkClear.mock.calls.map((c) => c[2])).toEqual([nearest.vector, reachable.vector]);
  });

  it("returns the raw nearest when its line is clear", () => {
    const near = node(1, 0);
    const ctx = { points: [node(5, 0), near], area: {} };
    walkClear.mockReturnValue(true);
    expect(
      AreaPath.prototype.getClosestReachablePathPoint.call(ctx, new THREE.Vector3())
    ).toBe(near);
  });

  it("returns undefined when no node is reachable", () => {
    const ctx = { points: [node(1, 0), node(2, 0)], area: {} };
    walkClear.mockReturnValue(false);
    expect(
      AreaPath.prototype.getClosestReachablePathPoint.call(ctx, new THREE.Vector3())
    ).toBeUndefined();
  });
});

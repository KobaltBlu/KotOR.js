/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const mockHasWalkLineClear = jest.fn();

jest.mock("@engine/pathfinding/walk-line-clear", () => ({
  WalkLineHitCode: {
    Fail: 0,
    Ok: 1,
    NonWalk: -1,
    DetailedBlock: -2,
    Creature: -3,
  },
  hasWalkLineClear: (...args: unknown[]) => mockHasWalkLineClear(...args),
}));

jest.mock("@engine/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.35,
  getCreaturePersonalSpace: () => 0.35,
}));

import {
  dropWalkmeshBlockedPathPrefix,
  findWalkClearDetour,
  isWalkmeshEdgeWalkClear,
  isWalkmeshHopBlocked,
  pathHopsAreWalkClear,
  WALKMESH_BLOCK_REPATH_FRAMES,
} from "@engine/pathfinding/path-hops-clear";
import { WalkLineHitCode } from "@engine/pathfinding/walk-line-clear";
import type { ComputedPath } from "@engine/pathfinding/ComputedPath";

describe("path-hops-clear", () => {
  beforeEach(() => {
    mockHasWalkLineClear.mockReset();
  });

  it("isWalkmeshEdgeWalkClear rejects NonWalk chords", () => {
    mockHasWalkLineClear.mockReturnValue({
      ok: false,
      code: WalkLineHitCode.NonWalk,
      clearT: 0.4,
      clearPoint: new THREE.Vector3(),
    });
    expect(
      isWalkmeshEdgeWalkClear(
        {} as any,
        new THREE.Vector3(),
        new THREE.Vector3(2, 0, 0)
      )
    ).toBe(false);
  });

  it("isWalkmeshEdgeWalkClear rejects hard DetailedBlock at origin", () => {
    mockHasWalkLineClear.mockReturnValue({
      ok: false,
      code: WalkLineHitCode.DetailedBlock,
      clearT: 0,
      clearPoint: new THREE.Vector3(),
    });
    expect(
      isWalkmeshEdgeWalkClear(
        {} as any,
        new THREE.Vector3(),
        new THREE.Vector3(2, 0, 0)
      )
    ).toBe(false);
  });

  it("isWalkmeshEdgeWalkClear accepts Ok chords", () => {
    mockHasWalkLineClear.mockReturnValue({
      ok: true,
      code: WalkLineHitCode.Ok,
      clearT: 1,
      clearPoint: new THREE.Vector3(2, 0, 0),
    });
    expect(
      isWalkmeshEdgeWalkClear(
        {} as any,
        new THREE.Vector3(),
        new THREE.Vector3(2, 0, 0)
      )
    ).toBe(true);
  });

  it("isWalkmeshHopBlocked is true on NonWalk", () => {
    mockHasWalkLineClear.mockReturnValue({
      ok: false,
      code: WalkLineHitCode.NonWalk,
      clearT: 0.5,
      clearPoint: new THREE.Vector3(),
    });
    expect(
      isWalkmeshHopBlocked(
        {} as any,
        new THREE.Vector3(),
        new THREE.Vector3(1, 0, 0)
      )
    ).toBe(true);
  });

  it("isWalkmeshHopBlocked ignores creature blocks", () => {
    mockHasWalkLineClear.mockReturnValue({
      ok: false,
      code: WalkLineHitCode.Creature,
      clearT: 0,
      clearPoint: new THREE.Vector3(),
    });
    expect(
      isWalkmeshHopBlocked(
        {} as any,
        new THREE.Vector3(),
        new THREE.Vector3(1, 0, 0)
      )
    ).toBe(false);
  });

  it("isWalkmeshHopBlocked waits for frames on partial DetailedBlock", () => {
    mockHasWalkLineClear.mockReturnValue({
      ok: false,
      code: WalkLineHitCode.DetailedBlock,
      clearT: 0.3,
      clearPoint: new THREE.Vector3(),
    });
    const from = new THREE.Vector3();
    const to = new THREE.Vector3(1, 0, 0);
    expect(isWalkmeshHopBlocked({} as any, from, to, undefined, 0)).toBe(false);
    expect(
      isWalkmeshHopBlocked(
        {} as any,
        from,
        to,
        undefined,
        WALKMESH_BLOCK_REPATH_FRAMES
      )
    ).toBe(true);
  });

  it("pathHopsAreWalkClear skips when area has no walkFaces", () => {
    const path = {
      points: [{ vector: new THREE.Vector3(1, 0, 0) }],
    } as ComputedPath;
    expect(
      pathHopsAreWalkClear(
        { walkFaces: [] } as any,
        new THREE.Vector3(),
        path
      )
    ).toBe(true);
    expect(mockHasWalkLineClear).not.toHaveBeenCalled();
  });

  it("pathHopsAreWalkClear skips zero-length duplicated origin hop", () => {
    const origin = new THREE.Vector3(78.945, 76.022, 0);
    mockHasWalkLineClear.mockReturnValue({
      ok: true,
      code: WalkLineHitCode.Ok,
      clearT: 1,
      clearPoint: origin.clone(),
    });
    const path = {
      points: [
        { vector: origin.clone() },
        { vector: new THREE.Vector3(80, 73, 0) },
      ],
    } as ComputedPath;
    expect(
      pathHopsAreWalkClear(
        { walkFaces: [{}] } as any,
        origin,
        path
      )
    ).toBe(true);
    // Only the non-degenerate hop is tested
    expect(mockHasWalkLineClear).toHaveBeenCalledTimes(1);
  });

  it("pathHopsAreWalkClear fails when a hop is NonWalk", () => {
    mockHasWalkLineClear.mockReturnValue({
      ok: false,
      code: WalkLineHitCode.NonWalk,
      clearT: 0,
      clearPoint: new THREE.Vector3(),
    });
    const path = {
      points: [{ vector: new THREE.Vector3(1, 0, 0) }],
    } as ComputedPath;
    expect(
      pathHopsAreWalkClear(
        { walkFaces: [{}] } as any,
        new THREE.Vector3(),
        path
      )
    ).toBe(false);
  });

  it("findWalkClearDetour prefers a candidate clear to dest", () => {
    const from = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(5, 0, 0);
    mockHasWalkLineClear.mockImplementation((
      _area: unknown,
      a: THREE.Vector3,
      b: THREE.Vector3
    ) => {
      // Clear from origin to eastern ring points; clear from those to dest
      const fromOrigin = a.x === 0 && a.y === 0;
      const toDest = Math.abs(b.x - 5) < 0.01 && Math.abs(b.y) < 0.01;
      if(fromOrigin || toDest){
        return { ok: true, code: WalkLineHitCode.Ok, clearT: 1, clearPoint: b.clone() };
      }
      return { ok: false, code: WalkLineHitCode.NonWalk, clearT: 0, clearPoint: a.clone() };
    });
    const area = {
      isPointWalkable: () => true,
    } as any;
    const detour = findWalkClearDetour(area, from, dest);
    expect(detour).toBeDefined();
    expect(detour!.x).not.toBe(0);
  });

  it("findWalkClearDetour picks the clear-to-dest candidate closest to dest within the first successful ring", () => {
    const from = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(10, 0, 0);
    mockHasWalkLineClear.mockImplementation((
      _area: unknown,
      a: THREE.Vector3,
      b: THREE.Vector3
    ) => {
      const fromOrigin = Math.hypot(a.x, a.y) < 1e-6;
      if(fromOrigin){
        // Only allow eastward candidates from origin.
        if(b.x > 0.1 && Math.abs(b.y) < 0.6){
          return { ok: true, code: WalkLineHitCode.Ok, clearT: 1, clearPoint: b.clone() };
        }
        return { ok: false, code: WalkLineHitCode.NonWalk, clearT: 0, clearPoint: a.clone() };
      }
      // All eastward ring points clear onward to dest.
      return { ok: true, code: WalkLineHitCode.Ok, clearT: 1, clearPoint: b.clone() };
    });
    const area = {
      isPointWalkable: () => true,
    } as any;
    const detour = findWalkClearDetour(area, from, dest);
    expect(detour).toBeDefined();
    // First ring (r=0.5) already yields clear-to-dest; prefer closest-to-dest on that ring (+X).
    expect(detour!.x).toBeCloseTo(0.5, 3);
    expect(Math.abs(detour!.y)).toBeLessThan(0.05);
  });

  it("findWalkClearDetour does not search outer rings once an inner clear-to-dest exists", () => {
    const from = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(10, 0, 0);
    let maxProbeRadius = 0;
    mockHasWalkLineClear.mockImplementation((
      _area: unknown,
      a: THREE.Vector3,
      b: THREE.Vector3
    ) => {
      const fromOrigin = Math.hypot(a.x, a.y) < 1e-6;
      if(fromOrigin){
        const r = Math.hypot(b.x, b.y);
        if(r > maxProbeRadius) maxProbeRadius = r;
        if(b.x > 0.1 && Math.abs(b.y) < 0.6){
          return { ok: true, code: WalkLineHitCode.Ok, clearT: 1, clearPoint: b.clone() };
        }
        return { ok: false, code: WalkLineHitCode.NonWalk, clearT: 0, clearPoint: a.clone() };
      }
      const r = Math.hypot(a.x, a.y);
      if(r > maxProbeRadius) maxProbeRadius = r;
      return { ok: true, code: WalkLineHitCode.Ok, clearT: 1, clearPoint: b.clone() };
    });
    const area = {
      isPointWalkable: () => true,
    } as any;
    const detour = findWalkClearDetour(area, from, dest);
    expect(detour).toBeDefined();
    // Outer radii (1.0+) must not be probed once r=0.5 finds clear-to-dest.
    expect(maxProbeRadius).toBeLessThan(0.75);
  });

  it("findWalkClearDetour rebases off-walkmesh origins to nearest walkable", () => {
    const from = new THREE.Vector3(0, 0, 0);
    const safe = new THREE.Vector3(0.4, 0, 0);
    const dest = new THREE.Vector3(5, 0, 0);
    mockHasWalkLineClear.mockImplementation((
      _area: unknown,
      a: THREE.Vector3,
      b: THREE.Vector3
    ) => {
      const fromSafe = Math.hypot(a.x - 0.4, a.y) < 1e-6;
      const toDest = Math.abs(b.x - 5) < 0.01 && Math.abs(b.y) < 0.01;
      if(fromSafe && toDest){
        return { ok: true, code: WalkLineHitCode.Ok, clearT: 1, clearPoint: b.clone() };
      }
      if(Math.hypot(a.x, a.y) < 1e-6){
        return {
          ok: false,
          code: WalkLineHitCode.DetailedBlock,
          clearT: 0,
          clearPoint: a.clone(),
        };
      }
      return { ok: true, code: WalkLineHitCode.Ok, clearT: 1, clearPoint: b.clone() };
    });
    const area = {
      isPointWalkable: (p: THREE.Vector3) => Math.hypot(p.x, p.y) > 0.2,
      getNearestWalkablePoint: () => safe.clone(),
    } as any;
    const detour = findWalkClearDetour(area, from, dest);
    expect(detour).toBeDefined();
    expect(detour!.x).toBeCloseTo(0.4, 3);
    expect(detour!.y).toBeCloseTo(0, 3);
  });

  it("dropWalkmeshBlockedPathPrefix pops leading blocked hops", () => {
    mockHasWalkLineClear
      .mockReturnValueOnce({
        ok: false,
        code: WalkLineHitCode.NonWalk,
        clearT: 0,
        clearPoint: new THREE.Vector3(),
      })
      .mockReturnValueOnce({
        ok: true,
        code: WalkLineHitCode.Ok,
        clearT: 1,
        clearPoint: new THREE.Vector3(),
      });
    const points = [
      { vector: new THREE.Vector3(1, 0, 0) },
      { vector: new THREE.Vector3(2, 0, 0) },
    ];
    const path = {
      points,
      pop: () => { points.shift(); },
    } as unknown as ComputedPath;
    const dropped = dropWalkmeshBlockedPathPrefix(
      {} as any,
      new THREE.Vector3(),
      path
    );
    expect(dropped).toBe(1);
    expect(points.length).toBe(1);
    expect(points[0].vector.x).toBe(2);
  });
});

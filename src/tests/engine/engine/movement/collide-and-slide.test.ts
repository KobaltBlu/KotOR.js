/**
 * Iterative collide-and-slide solver against stub geometry.
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({ GameState: {} }));

import {
  solveCollideAndSlide,
  type CollideAndSlideProbe,
} from "@engine/movement/collide-and-slide";
import type { Area } from "@engine/module/Area";
import type { WalkmeshEdge } from "@engine/odyssey/WalkmeshEdge";
import { MovementHitKind } from "@engine/movement/types";

type Wall = { a: [number, number]; b: [number, number]; n: [number, number] };

function edgesOf(walls: Wall[]): WalkmeshEdge[] {
  return walls.map((w) => ({
    transition: -1,
    line: new THREE.Line3(
      new THREE.Vector3(w.a[0], w.a[1], 0),
      new THREE.Vector3(w.b[0], w.b[1], 0)
    ),
    normal: new THREE.Vector3(w.n[0], w.n[1], 0),
  }) as unknown as WalkmeshEdge);
}

/**
 * Center-line probe against infinite-ish wall segments: first crossing of a
 * wall from its front side. Reports the real edge normal unless `synthetic`.
 */
function wallProbe(walls: Wall[], synthetic = false){
  return (from: THREE.Vector3, to: THREE.Vector3): CollideAndSlideProbe => {
    let bestT = Infinity;
    let bestN: [number, number] | undefined;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    for(const w of walls){
      const [nx, ny] = w.n;
      const d0 = (from.x - w.a[0]) * nx + (from.y - w.a[1]) * ny;
      const d1 = (to.x - w.a[0]) * nx + (to.y - w.a[1]) * ny;
      if(d0 < -1e-9 || d1 >= 0) continue;
      const t = d0 / (d0 - d1);
      // Within segment extent?
      const hx = from.x + dx * t;
      const hy = from.y + dy * t;
      const ex = w.b[0] - w.a[0];
      const ey = w.b[1] - w.a[1];
      const s = ((hx - w.a[0]) * ex + (hy - w.a[1]) * ey) / (ex * ex + ey * ey);
      if(s < -1e-9 || s > 1 + 1e-9) continue;
      if(t < bestT){
        bestT = t;
        bestN = w.n;
      }
    }
    if(!bestN) return { clear: true, clearT: 1 };
    const len = Math.hypot(dx, dy) || 1;
    return {
      clear: false,
      clearT: bestT,
      normalX: synthetic ? -dx / len : bestN[0],
      normalY: synthetic ? -dy / len : bestN[1],
      normalUsable: !synthetic,
      hit: { kind: MovementHitKind.Walkmesh },
    };
  };
}

function solve(
  walls: Wall[],
  origin: [number, number],
  desired: [number, number],
  opts: { synthetic?: boolean; gatherEdges?: boolean } = {}
){
  const area = {
    walkEdges: opts.gatherEdges === false ? [] : edgesOf(walls),
  } as unknown as Area;
  return solveCollideAndSlide(
    new THREE.Vector3(origin[0], origin[1], 0),
    new THREE.Vector3(desired[0], desired[1], 0),
    {
      area,
      radius: 0.4,
      probe: wallProbe(walls, opts.synthetic),
    }
  );
}

// Wall along y = 0, walkable side +Y.
const FLOOR: Wall = { a: [-50, 0], b: [50, 0], n: [0, 1] };
// Wall along x = 0, walkable side +X... used for an L corner at origin.
const LEFT: Wall = { a: [0, -50], b: [0, 50], n: [1, 0] };
// Right wall at x = 1, walkable side −X (corner with FLOOR).
const RIGHT: Wall = { a: [1, -50], b: [1, 50], n: [-1, 0] };

describe("solveCollideAndSlide", () => {
  it("takes the full step when unobstructed", () => {
    const r = solve([FLOOR], [0, 1], [0.3, 0.2]);
    expect(r.unobstructed).toBe(true);
    expect(r.position.x).toBeCloseTo(0.3);
    expect(r.position.y).toBeCloseTo(1.2);
  });

  it("slides along a straight wall and never exceeds the requested length", () => {
    const r = solve([FLOOR], [0, 0.1], [0.5, -0.5]);
    expect(r.unobstructed).toBe(false);
    expect(r.moved).toBeGreaterThan(0.2);
    expect(r.moved).toBeLessThanOrEqual(Math.hypot(0.5, -0.5) + 1e-9);
    expect(r.position.y).toBeGreaterThanOrEqual(0);
    expect(r.position.x).toBeGreaterThan(0.2);
  });

  it("slides even when the probe normal is synthetic (-direction)", () => {
    // Regression: a -direction normal used to cancel the whole step.
    const r = solve([FLOOR], [0, 0.05], [0.4, -0.3], { synthetic: true });
    expect(r.position.x).toBeGreaterThan(0.2);
    expect(r.position.y).toBeGreaterThanOrEqual(0);
  });

  it("stops cleanly in an inside corner without jitter", () => {
    const r = solve([FLOOR, RIGHT], [0.9, 0.05], [0.5, -0.5]);
    expect(r.position.x).toBeLessThanOrEqual(1);
    expect(r.position.y).toBeGreaterThanOrEqual(0);
    expect(r.moved).toBeLessThan(0.15);
  });

  it("keeps axis motion in a corridor", () => {
    const CEIL: Wall = { a: [-50, 1], b: [50, 1], n: [0, -1] };
    const r = solve([FLOOR, CEIL], [0, 0.5], [0.6, 0.9]);
    expect(r.position.y).toBeLessThanOrEqual(1);
    expect(r.position.x).toBeGreaterThan(0.3);
  });

  it("never moves backward against the intent", () => {
    const r = solve([FLOOR, LEFT], [0.05, 0.05], [-0.5, -0.5]);
    expect(r.position.x * -0.5 + r.position.y * -0.5).toBeGreaterThanOrEqual(
      0.05 * -0.5 + 0.05 * -0.5 - 1e-9
    );
  });

  it("halves the step when a pessimistic probe blocks with no contact info", () => {
    // Probe rejects any leg longer than 0.3 with clearT 0 and no normal.
    const area = { walkEdges: [] } as unknown as Area;
    const r = solveCollideAndSlide(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      {
        area,
        radius: 0.4,
        probe: (from, to) =>
          to.distanceTo(from) > 0.3
            ? { clear: false, clearT: 0, hit: { kind: MovementHitKind.Static } }
            : { clear: true, clearT: 1 },
      }
    );
    expect(r.position.x).toBeCloseTo(0.25);
  });

  it("stops a leg when validateLeg rejects it", () => {
    const area = { walkEdges: [] } as unknown as Area;
    const r = solveCollideAndSlide(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      {
        area,
        radius: 0.4,
        probe: () => ({ clear: true, clearT: 1 }),
        validateLeg: () => false,
      }
    );
    expect(r.moved).toBe(0);
  });
});

describe("solveCollideAndSlide with unreliable clearT hints", () => {
  it("does not advance into an obstacle when a blocked probe reports clearT = 1", () => {
    // Live DetailedBlock behaviour: stadium hits project the hit point onto
    // the segment and report clearT ≈ 1. Obstacle face at x = 1 (capsule
    // centre must stay at x <= 0.6 with radius 0.4).
    const area = { walkEdges: [] } as unknown as Area;
    const r = solveCollideAndSlide(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0.3, 0),
      {
        area,
        radius: 0.4,
        probe: (_from, to) =>
          to.x > 0.6
            ? {
              clear: false,
              clearT: 1,
              normalX: -1,
              normalY: 0,
              normalUsable: true,
              hit: { kind: MovementHitKind.Static },
            }
            : { clear: true, clearT: 1 },
      }
    );
    expect(r.position.x).toBeLessThanOrEqual(0.6);
    expect(r.position.x).toBeGreaterThan(0.5);
    // Leftover slides along the face (+Y), not stuck.
    expect(r.position.y).toBeGreaterThan(0.2);
    expect(r.moved).toBeLessThanOrEqual(Math.hypot(1, 0.3) + 1e-9);
  });
});

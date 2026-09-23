/**
 * buildGridPath grid DFS (G3).
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

jest.mock("@/engine/pathfinding/walk-line-clear", () => ({
  hasClearWalkLine: (
    area: { isPointWalkable?: (p: THREE.Vector3) => boolean },
    a: THREE.Vector3,
    b: THREE.Vector3
  ) => {
    const steps = 10;
    for(let i = 1; i <= steps; i++){
      const t = i / steps;
      const p = new THREE.Vector3(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        0
      );
      if(area.isPointWalkable && !area.isPointWalkable(p)){
        return false;
      }
    }
    return true;
  },
  hasWalkLineClear: (
    area: { isPointWalkable?: (p: THREE.Vector3) => boolean },
    a: THREE.Vector3,
    b: THREE.Vector3
  ) => {
    const steps = 8;
    for(let i = 1; i <= steps; i++){
      const t = i / steps;
      const p = new THREE.Vector3(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        0
      );
      if(area.isPointWalkable && !area.isPointWalkable(p)){
        return { ok: false, code: 2, clearT: (i - 1) / steps, clearPoint: p };
      }
    }
    return { ok: true, code: 1, clearT: 1, clearPoint: b.clone() };
  },
}));

jest.mock("@/engine/pathfinding/smooth-select-nodes", () => ({
  smoothSelection: (_area: unknown, world: THREE.Vector3[]) => world,
}));

jest.mock("@/engine/pathfinding/path-point-creature-detour", () => ({
  getPathStepTolerance: () => 2,
}));

import { buildGridPath } from "@/engine/pathfinding/build-grid-path";
import type { ModuleArea } from "@/module/ModuleArea";

/** L-corridor: blocked strip at y≈0 for x in (1.5, 3.5); go around via y=2. */
function makeLCorridorArea(): ModuleArea {
  return {
    isPointWalkable: (p: THREE.Vector3) => {
      if(p.x > 1.5 && p.x < 3.5 && Math.abs(p.y) < 0.75){
        return false;
      }
      return true;
    },
    getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
  } as unknown as ModuleArea;
}

describe("buildGridPath GridDFS (G3)", () => {
  it("finds a path through an empty-PTH L-corridor", () => {
    const area = makeLCorridorArea();
    const origin = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(5, 0, 0);
    const path = buildGridPath(area, origin, dest, { personalSpace: 0.5, maxLateral: 16 });
    expect(path).toBeDefined();
    expect(path!.length).toBeGreaterThanOrEqual(2);
    expect(path![path!.length - 1].distanceTo(dest)).toBeLessThan(0.5);
    // Must leave the blocked mid-line somehow (lateral detour)
    const maxAbsY = path!.reduce((m, p) => Math.max(m, Math.abs(p.y)), 0);
    expect(maxAbsY).toBeGreaterThan(0.4);
  });

  it("returns undefined when dest is unreachable", () => {
    // Entire plane non-walkable except origin — dest and corridor blocked
    const area = {
      isPointWalkable: (p: THREE.Vector3) =>
        Math.hypot(p.x, p.y) < 0.2,
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
    } as unknown as ModuleArea;
    // Override hasClearWalkLine mock: origin→dest must not snap
    const path = buildGridPath(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0),
      { personalSpace: 0.5, maxLateral: 4 }
    );
    expect(path).toBeUndefined();
  });

  it("does not accept partial clearT across a NonWalk strip", () => {
    // Thin non-walk band; endpoints walkable — old canStep used clearT>=0.85
    const area = {
      isPointWalkable: (p: THREE.Vector3) =>
        !(p.x > 2.2 && p.x < 2.8 && Math.abs(p.y) < 0.5),
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
    } as unknown as ModuleArea;
    const path = buildGridPath(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0),
      { personalSpace: 0.5, maxLateral: 16 }
    );
    expect(path).toBeDefined();
    // Every consecutive hop must stay on walkable samples (no chord through the strip)
    for(let i = 0; i < path!.length - 1; i++){
      const a = path![i];
      const b = path![i + 1];
      for(let s = 1; s <= 8; s++){
        const t = s / 8;
        const p = new THREE.Vector3(
          a.x + (b.x - a.x) * t,
          a.y + (b.y - a.y) * t,
          0
        );
        expect(area.isPointWalkable(p)).toBe(true);
      }
    }
  });
});

/**
 * PlotPathAroundCreature — FindEntryAndExit miss must not splice (retail return 0).
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";
import { ComputedPath } from "@/engine/pathfinding/ComputedPath";
import { PathPoint } from "@/engine/pathfinding/PathPoint";
import { plotPathAroundCreature } from "@/engine/pathfinding/plot-path-around-creature";
import type { ModuleCreature } from "@/module/ModuleCreature";

jest.mock("@/GameState", () => ({
  GameState: {
    PartyManager: { party: [] },
    ModuleObjectManager: { GetObjectById: () => undefined },
  },
}));

jest.mock("@/combat/attack-range", () => ({
  getCreaturePersonalSpace: () => 0.4,
}));

jest.mock("@/engine/pathfinding/test-direct-line", () => ({
  testDirectLine: () => ({ ok: true }),
}));

jest.mock("@/engine/pathfinding/compute-safe-location", () => ({
  computeHeightAtPoint: (_area: unknown, p: THREE.Vector3) => p.z,
}));

function makeCreature(
  pos: THREE.Vector3,
  pathPoints: THREE.Vector3[],
  id = 1
): ModuleCreature {
  const path = ComputedPath.FromVector3List(pathPoints);
  return {
    id,
    position: pos.clone(),
    rotation: { z: 0 },
    area: {
      creatures: [],
      isPointWalkable: () => true,
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
    },
    getFacing: () => 0,
    getComputedPath: () => path,
  } as unknown as ModuleCreature;
}

describe("plotPathAroundCreature", () => {
  it("does not splice when FindEntryAndExit misses (retail return 0)", () => {
    // Path and blocker are far apart — no segment crosses the hex
    const creature = makeCreature(
      new THREE.Vector3(0, 0, 0),
      [new THREE.Vector3(1, 0, 0), new THREE.Vector3(2, 0, 0)]
    );
    const blocker = {
      id: 9,
      position: new THREE.Vector3(100, 100, 0),
    } as unknown as ModuleCreature;

    const before = creature.getComputedPath()!.points.map((p) => p.vector.clone());
    const result = plotPathAroundCreature(creature, blocker);

    expect(result.spliced).toBe(false);
    const after = creature.getComputedPath()!.points;
    expect(after.length).toBe(before.length);
    expect(after[0].vector.x).toBeCloseTo(before[0].x);
    expect(after[after.length - 1].vector.x).toBeCloseTo(before[before.length - 1].x);
  });

  it("splices a hex detour when creature→dest crosses the blocker (prepended live pos)", () => {
    // Remaining path is only the destination (after pop); blocker sits beside the mover
    const dest = new THREE.Vector3(10, 0, 0);
    const creature = makeCreature(new THREE.Vector3(0, 0, 0), [dest]);
    const blocker = {
      id: 9,
      position: new THREE.Vector3(0.5, 0.7, 0),
    } as unknown as ModuleCreature;
    creature.area.creatures = [blocker];

    const result = plotPathAroundCreature(creature, blocker);

    expect(result.spliced).toBe(true);
    const pts = creature.getComputedPath()!.points;
    expect(pts.length).toBeGreaterThan(1);
    // Next walk target must not remain the far destination alone at index 0
    const first = pts[0].vector;
    const distFirst = Math.hypot(first.x - 0, first.y - 0);
    const distDest = Math.hypot(dest.x - 0, dest.y - 0);
    expect(distFirst).toBeLessThan(distDest);
  });

  it("does not grow the path unboundedly across repeated miss attempts", () => {
    const creature = makeCreature(
      new THREE.Vector3(0, 0, 0),
      [new THREE.Vector3(5, 0, 0)]
    );
    const blocker = {
      id: 9,
      position: new THREE.Vector3(50, 50, 0),
    } as unknown as ModuleCreature;

    for(let i = 0; i < 20; i++){
      plotPathAroundCreature(creature, blocker);
    }
    expect(creature.getComputedPath()!.points.length).toBe(1);
  });
});

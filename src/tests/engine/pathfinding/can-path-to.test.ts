/**
 * canPathTo via buildWalkPath Ready|Incomplete (G7).
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

/** Avoid pulling GameState → three/examples ESM via plot-path. */
const WalkPathCode = { Incomplete: 1, Ready: 2, Fail: 3 } as const;
const buildWalkPathMock = jest.fn();

jest.mock("@/engine/pathfinding/build-walk-path", () => ({
  WalkPathCode: { Incomplete: 1, Ready: 2, Fail: 3 },
  buildWalkPath: (...args: unknown[]) => buildWalkPathMock(...args),
}));

import { canPathToPoint } from "@/engine/pathfinding/can-path-to";
import type { ModuleCreature } from "@/module/ModuleCreature";

function makeCreature(): ModuleCreature {
  return {
    id: 1,
    position: new THREE.Vector3(0, 0, 0),
    area: {
      isPointWalkable: () => true,
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
    },
  } as unknown as ModuleCreature;
}

describe("canPathToPoint (G7)", () => {
  it("returns true on buildWalkPath Incomplete (resume)", () => {
    buildWalkPathMock.mockReturnValue({ code: WalkPathCode.Incomplete, points: [] });
    expect(canPathToPoint(makeCreature(), new THREE.Vector3(5, 0, 0))).toBe(true);
  });

  it("returns true on buildWalkPath Ready", () => {
    buildWalkPathMock.mockReturnValue({
      code: WalkPathCode.Ready,
      points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0)],
    });
    expect(canPathToPoint(makeCreature(), new THREE.Vector3(5, 0, 0))).toBe(true);
  });

  it("returns false on buildWalkPath Fail", () => {
    buildWalkPathMock.mockReturnValue({ code: WalkPathCode.Fail, points: [] });
    expect(canPathToPoint(makeCreature(), new THREE.Vector3(5, 0, 0))).toBe(false);
  });
});

/**
 * canPathTo via plotPath Ready|Incomplete (G7).
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

/** Avoid pulling GameState → three/examples ESM via plot-path. */
const PlotPathCode = { Incomplete: 1, Ready: 2, Fail: 3 } as const;
const plotPathMock = jest.fn();

jest.mock("@/engine/pathfinding/plot-path", () => ({
  PlotPathCode: { Incomplete: 1, Ready: 2, Fail: 3 },
  plotPath: (...args: unknown[]) => plotPathMock(...args),
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
  it("returns true on PlotPath Incomplete (resume)", () => {
    plotPathMock.mockReturnValue({ code: PlotPathCode.Incomplete, points: [] });
    expect(canPathToPoint(makeCreature(), new THREE.Vector3(5, 0, 0))).toBe(true);
  });

  it("returns true on PlotPath Ready", () => {
    plotPathMock.mockReturnValue({
      code: PlotPathCode.Ready,
      points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0)],
    });
    expect(canPathToPoint(makeCreature(), new THREE.Vector3(5, 0, 0))).toBe(true);
  });

  it("returns false on PlotPath Fail", () => {
    plotPathMock.mockReturnValue({ code: PlotPathCode.Fail, points: [] });
    expect(canPathToPoint(makeCreature(), new THREE.Vector3(5, 0, 0))).toBe(false);
  });
});

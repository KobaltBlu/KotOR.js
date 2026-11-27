/**
 * Thin drive probe: clip + one stadium, no refine / room BFS / sample rings.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const clippedMock = jest.fn();
const staticDetailedMock = jest.fn();
const refineMock = jest.fn();

jest.mock("@engine/pathfinding/clipped-line-segment", () => ({
  clippedLineSegmentWalkable: (...args: unknown[]) => clippedMock(...args),
}));

jest.mock("@engine/pathfinding/static-walk-blockers", () => ({
  isStaticWalkClearDetailed: (...args: unknown[]) => staticDetailedMock(...args),
}));

// If thin probe accidentally pulls in full WLC refine, this mock fails the suite.
jest.mock("@engine/pathfinding/walk-line-clear", () => {
  const actual = jest.requireActual(
    "@engine/pathfinding/walk-line-clear"
  ) as Record<string, unknown>;
  return {
    ...actual,
    refineDetailedClearT: (...args: unknown[]) => {
      refineMock(...args);
      throw new Error("refineDetailedClearT must not run from thin drive probe");
    },
  };
});

import {
  probeDriveStepClear,
  resetDriveProbeCount,
  getDriveProbeCount,
} from "@engine/pathfinding/drive-step-clear";
import type { Area } from "@engine/module/Area";

describe("probeDriveStepClear", () => {
  const area = {
    rooms: [{ id: 1 }],
    walkFaces: [{ id: 1 }],
    getWalkCandidatesForBox: jest.fn(() => ({ faces: [], edges: [], rooms: [] })),
  } as unknown as Area;

  beforeEach(() => {
    clippedMock.mockReset();
    staticDetailedMock.mockReset();
    refineMock.mockReset();
    resetDriveProbeCount();
    (area.getWalkCandidatesForBox as jest.Mock).mockClear();
    clippedMock.mockReturnValue({
      ok: true,
      clearT: 1,
      clearPoint: new THREE.Vector3(1, 0, 0),
      minZ: 0,
      maxZ: 0,
    });
    staticDetailedMock.mockReturnValue({ clear: true });
  });

  it("returns clear without calling refine when clip + static pass", () => {
    const from = new THREE.Vector3(0, 0, 0);
    const to = new THREE.Vector3(2, 0, 0);
    const hit = probeDriveStepClear(area, from, to, { personalSpace: 0.5 });
    expect(hit.clear).toBe(true);
    expect(hit.clearT).toBe(1);
    expect(refineMock).not.toHaveBeenCalled();
    expect(staticDetailedMock).toHaveBeenCalledTimes(1);
    expect(getDriveProbeCount()).toBe(1);
  });

  it("passes candidateFaces into static detailed (single gather)", () => {
    const faces = [{ id: "f1" }];
    (area.getWalkCandidatesForBox as jest.Mock).mockReturnValue({
      faces,
      edges: [],
      rooms: [],
    });
    probeDriveStepClear(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      { personalSpace: 0.4 }
    );
    expect(area.getWalkCandidatesForBox).toHaveBeenCalledTimes(1);
    const opts = staticDetailedMock.mock.calls[0][3] as {
      candidateFaces?: unknown[];
    };
    expect(opts.candidateFaces).toBe(faces);
  });

  it("derives clearT from stadium hitPoint without refine", () => {
    staticDetailedMock.mockImplementation((
      _a: unknown,
      from: THREE.Vector3,
      to: THREE.Vector3,
      options: { hit?: { kind: number; hitPoint: THREE.Vector3; normal: THREE.Vector3 } }
    ) => {
      if(options.hit){
        options.hit.kind = 1;
        options.hit.hitPoint.set(
          from.x + (to.x - from.x) * 0.4,
          from.y + (to.y - from.y) * 0.4,
          from.z
        );
        options.hit.normal.set(-1, 0, 0);
      }
      return { clear: false, blockingObjectId: 42 };
    });

    const hit = probeDriveStepClear(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0),
      { personalSpace: 0.5 }
    );
    expect(hit.clear).toBe(false);
    expect(hit.clearT).toBeCloseTo(0.4, 5);
    expect(hit.blockingObjectId).toBe(42);
    expect(hit.normal.x).toBeCloseTo(-1, 5);
    expect(refineMock).not.toHaveBeenCalled();
  });

  it("returns early on clip wall without static stadium", () => {
    clippedMock.mockReturnValue({
      ok: false,
      clearT: 0.3,
      clearPoint: new THREE.Vector3(3, 0, 0),
      minZ: 0,
      maxZ: 0,
    });
    const hit = probeDriveStepClear(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0)
    );
    expect(hit.clear).toBe(false);
    expect(hit.clearT).toBeCloseTo(0.3, 5);
    expect(staticDetailedMock).not.toHaveBeenCalled();
  });
});

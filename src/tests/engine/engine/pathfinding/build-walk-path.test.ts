/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const mockPathHopsAreWalkClear = jest.fn(() => true);

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    GameObjectManager: { GetObjectById: () => undefined },
    module: undefined,
  },
}));

jest.mock("@engine/pathfinding/inter-area-path", () => ({
  beginInterAreaPath: () => false,
}));

jest.mock("@engine/pathfinding/path-hops-clear", () => ({
  pathHopsAreWalkClear: (...args: unknown[]) => mockPathHopsAreWalkClear(...args),
}));

import {
  buildWalkPath,
  WalkPathCode,
  type PathFindInfoLite,
} from "@engine/pathfinding/build-walk-path";

function makePath(points: THREE.Vector3[], opts: {
  incomplete?: boolean;
  realtime?: boolean;
  smoothResume?: boolean;
  smoothCornerResume?: boolean;
} = {}): any {
  return {
    points: points.map((v) => ({ vector: v.clone() })),
    incomplete: !!opts.incomplete,
    realtime: !!opts.realtime,
    smoothResume: opts.smoothResume
      ? { stage: 2, working: points.map((p) => p.clone()) }
      : undefined,
    smoothCornerResume: opts.smoothCornerResume
      ? { cornerIndex: 1, working: points.map((p) => p.clone()) }
      : undefined,
  };
}

describe("buildWalkPath return codes", () => {
  beforeEach(() => {
    mockPathHopsAreWalkClear.mockReset();
    mockPathHopsAreWalkClear.mockReturnValue(true);
  });

  it("returns Ready for a finished polyline", () => {
    const origin = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(5, 0, 0);
    const owner = { id: 7, position: origin.clone(), area: undefined } as any;
    const path = makePath([origin, dest]);
    const area = {
      id: 1,
      path: {
        traverseToPoint: () => path,
        hasPendingSmoothSession: () => false,
      },
    } as any;

    const info: PathFindInfoLite = {
      ownerId: 7,
      origin: origin.clone(),
      dest: dest.clone(),
    };
    const r = buildWalkPath(area, owner, info);
    expect(r.code).toBe(WalkPathCode.Ready);
    expect(r.path).toBe(path);
    expect(info.lastCode).toBe(WalkPathCode.Ready);
  });

  it("early-outs Ready when lastCode Ready and endpoints unchanged", () => {
    const origin = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(5, 0, 0);
    const owner = { id: 7, position: origin.clone() } as any;
    let calls = 0;
    const area = {
      id: 1,
      path: {
        traverseToPoint: () => {
          calls++;
          return makePath([origin, dest]);
        },
        hasPendingSmoothSession: () => false,
      },
    } as any;

    const info: PathFindInfoLite = {
      ownerId: 7,
      origin: origin.clone(),
      dest: dest.clone(),
      lastCode: WalkPathCode.Ready,
      lastOrigin: origin.clone(),
      lastDest: dest.clone(),
    };
    const r = buildWalkPath(area, owner, info);
    expect(r.code).toBe(WalkPathCode.Ready);
    expect(r.path).toBeUndefined();
    expect(calls).toBe(0);
  });

  it("returns Incomplete when path is mid-smooth", () => {
    const origin = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(5, 0, 0);
    const owner = { id: 7, position: origin.clone() } as any;
    const path = makePath([origin, dest], { smoothResume: true, realtime: true });
    const area = {
      id: 1,
      path: {
        traverseToPoint: () => path,
        hasPendingSmoothSession: () => true,
      },
    } as any;

    const info: PathFindInfoLite = {
      ownerId: 7,
      origin: origin.clone(),
      dest: dest.clone(),
    };
    const r = buildWalkPath(area, owner, info);
    expect(r.code).toBe(WalkPathCode.Incomplete);
  });

  it("returns Incomplete for empty budget-exhausted stub (not Fail stay-put)", () => {
    const origin = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(10, 0, 0);
    const owner = { id: 7, position: origin.clone() } as any;
    const path = makePath([], { incomplete: true });
    const area = {
      id: 1,
      path: {
        traverseToPoint: () => path,
        hasPendingSmoothSession: () => false,
      },
    } as any;

    const info: PathFindInfoLite = {
      ownerId: 7,
      origin: origin.clone(),
      dest: dest.clone(),
    };
    const r = buildWalkPath(area, owner, info);
    expect(r.code).toBe(WalkPathCode.Incomplete);
    expect(r.path?.points?.length ?? 0).toBe(0);
    expect(info.lastCode).toBe(WalkPathCode.Incomplete);
  });

  it("returns Fail for stay-put when dest is far", () => {
    const origin = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(10, 0, 0);
    const owner = { id: 7, position: origin.clone() } as any;
    const path = makePath([origin.clone(), origin.clone()]);
    const area = {
      id: 1,
      path: {
        traverseToPoint: () => path,
        hasPendingSmoothSession: () => false,
      },
    } as any;

    const info: PathFindInfoLite = {
      ownerId: 7,
      origin: origin.clone(),
      dest: dest.clone(),
    };
    const r = buildWalkPath(area, owner, info);
    expect(r.code).toBe(WalkPathCode.Fail);
  });

  it("rebuilds unsmoothed when smooth hops fail walk-line clear", () => {
    const origin = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(5, 0, 0);
    const owner = { id: 7, position: origin.clone() } as any;
    const smoothPath = makePath([origin, dest]);
    const unsmoothPath = makePath([
      origin,
      new THREE.Vector3(2, 1, 0),
      dest,
    ]);
    const calls: boolean[] = [];
    const area = {
      id: 1,
      path: {
        traverseToPoint: (_o: unknown, _a: unknown, _b: unknown, smooth: boolean) => {
          calls.push(smooth);
          return smooth ? smoothPath : unsmoothPath;
        },
        hasPendingSmoothSession: () => false,
      },
    } as any;

    mockPathHopsAreWalkClear.mockReturnValueOnce(false);

    const info: PathFindInfoLite = {
      ownerId: 7,
      origin: origin.clone(),
      dest: dest.clone(),
    };
    const r = buildWalkPath(area, owner, info);
    expect(calls).toEqual([true, false]);
    expect(r.code).toBe(WalkPathCode.Ready);
    expect(r.path).toBe(unsmoothPath);
  });

  it("returns Fail when smooth and unsmooth hops both fail walk-line clear", () => {
    const origin = new THREE.Vector3(0, 0, 0);
    const dest = new THREE.Vector3(5, 0, 0);
    const owner = { id: 7, position: origin.clone() } as any;
    const poison = makePath([origin, dest]);
    const area = {
      id: 1,
      path: {
        traverseToPoint: () => poison,
        hasPendingSmoothSession: () => false,
      },
    } as any;

    mockPathHopsAreWalkClear.mockReturnValue(false);

    const info: PathFindInfoLite = {
      ownerId: 7,
      origin: origin.clone(),
      dest: dest.clone(),
    };
    const r = buildWalkPath(area, owner, info);
    expect(r.code).toBe(WalkPathCode.Fail);
    expect(info.lastCode).toBe(WalkPathCode.Fail);
  });
});

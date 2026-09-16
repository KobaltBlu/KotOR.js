/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@/GameState", () => ({
  GameState: {
    ModuleObjectManager: { GetObjectById: () => undefined },
    module: undefined,
  },
}));

jest.mock("@/engine/pathfinding/inter-area-path", () => ({
  beginInterAreaPath: () => false,
}));

import {
  buildWalkPath,
  WalkPathCode,
  type PathFindInfoLite,
} from "@/engine/pathfinding/build-walk-path";

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
});

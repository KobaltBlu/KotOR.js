/**
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    ModuleObjectManager: { GetObjectById: () => undefined },
    module: undefined,
  },
}));

const isStaticWalkClearOnWalkMeshMock = jest.fn(() => ({ clear: true }));
const walkMeshHasStartOverlapMock = jest.fn(() => false);

jest.mock("@engine/pathfinding/static-walk-blockers-mesh", () => ({
  isStaticWalkClearOnWalkMesh: (...args: unknown[]) =>
    isStaticWalkClearOnWalkMeshMock(...args),
  isStaticWalkClearOnAreaMesh: () => ({ clear: true }),
  walkMeshHasStartOverlap: (...args: unknown[]) =>
    walkMeshHasStartOverlapMock(...args),
}));

import { isStaticWalkClearDetailed } from "@engine/pathfinding/static-walk-blockers";
import type { ModuleArea } from "@engine/module/ModuleArea";
import type { ModuleDoor } from "@engine/module/ModuleDoor";

function makeDoor(opts: {
  open: boolean;
  faces?: number;
  id?: number;
}): ModuleDoor {
  const position = new THREE.Vector3(0, 0, 0);
  const box = new THREE.Box3(
    new THREE.Vector3(-1, -0.2, 0),
    new THREE.Vector3(1, 0.2, 2),
  );
  const faces = opts.faces
    ? Array.from({ length: opts.faces }, () => ({}))
    : [];
  const wok = faces.length
    ? { faces, edges: new Map() }
    : undefined;
  return {
    id: opts.id ?? 1,
    position,
    facing: 0,
    box,
    isOpen: () => opts.open,
    getWalkmeshForOpenState: () => wok,
    collisionManager: { walkmesh: wok },
  } as unknown as ModuleDoor;
}

function makePlaceable(opts: {
  id: number;
  x: number;
  y: number;
  faces?: number;
}): any {
  const half = 0.5;
  const faces = opts.faces
    ? Array.from({ length: opts.faces }, () => ({}))
    : [{}, {}];
  return {
    id: opts.id,
    isStatic: () => true,
    position: new THREE.Vector3(opts.x, opts.y, 0),
    box: new THREE.Box3(
      new THREE.Vector3(opts.x - half, opts.y - half, 0),
      new THREE.Vector3(opts.x + half, opts.y + half, 1),
    ),
    collisionMatrixDirty: false,
    syncWalkmeshMatrix: jest.fn(),
    collisionManager: {
      walkmesh: {
        faces,
        matrixWorld: new THREE.Matrix4(),
        mat4: new THREE.Matrix4(),
      },
    },
  };
}

describe("isStaticWalkClearDetailed door open mesh", () => {
  beforeEach(() => {
    isStaticWalkClearOnWalkMeshMock.mockReset();
    isStaticWalkClearOnWalkMeshMock.mockReturnValue({ clear: true });
    walkMeshHasStartOverlapMock.mockReset();
    walkMeshHasStartOverlapMock.mockReturnValue(false);
  });

  it("open door with empty/missing wok does not facing-plane block", () => {
    const door = makeDoor({ open: true, faces: 0 });
    const area = {
      doors: [door],
      placeables: [],
      staticBlockerGridDirty: true,
    } as unknown as ModuleArea;
    const from = new THREE.Vector3(0, -2, 0);
    const to = new THREE.Vector3(0, 2, 0);
    const result = isStaticWalkClearDetailed(area, from, to, { skipMesh: true });
    expect(result.clear).toBe(true);
  });

  it("closed door with no wok uses facing-plane and can block", () => {
    const door = makeDoor({ open: false, faces: 0 });
    const area = {
      doors: [door],
      placeables: [],
      staticBlockerGridDirty: true,
    } as unknown as ModuleArea;
    // Facing 0 → normal along +X; cross from −X to +X through the door box
    const from = new THREE.Vector3(-2, 0, 0);
    const to = new THREE.Vector3(2, 0, 0);
    const result = isStaticWalkClearDetailed(area, from, to, { skipMesh: true });
    expect(result.clear).toBe(false);
    expect(result.blockingObjectId).toBe(door.id);
  });
});

describe("isStaticWalkClearDetailed static placeables", () => {
  beforeEach(() => {
    isStaticWalkClearOnWalkMeshMock.mockReset();
    isStaticWalkClearOnWalkMeshMock.mockReturnValue({ clear: true });
    walkMeshHasStartOverlapMock.mockReset();
    walkMeshHasStartOverlapMock.mockReturnValue(false);
  });

  it("static placeable without surface wok does not AABB-block", () => {
    const plc = {
      id: 301,
      isStatic: () => true,
      box: new THREE.Box3(
        new THREE.Vector3(-0.5, -0.5, 0),
        new THREE.Vector3(0.5, 0.5, 1),
      ),
      position: new THREE.Vector3(0, 0, 0),
      collisionManager: { walkmesh: undefined },
    };
    const area = {
      doors: [],
      placeables: [plc],
      staticBlockerGridDirty: true,
    } as unknown as ModuleArea;
    const from = new THREE.Vector3(-2, 0, 0);
    const to = new THREE.Vector3(2, 0, 0);
    const result = isStaticWalkClearDetailed(area, from, to, { skipMesh: true });
    expect(result.clear).toBe(true);
  });

  it("skips far placeable mesh tests via spatial grid", () => {
    const near = makePlaceable({ id: 1, x: 0, y: 0 });
    const far = makePlaceable({ id: 2, x: 100, y: 100 });
    const area = {
      doors: [],
      placeables: [near, far],
      staticBlockerGridDirty: true,
    } as unknown as ModuleArea;
    const from = new THREE.Vector3(-2, 0, 0);
    const to = new THREE.Vector3(2, 0, 0);
    isStaticWalkClearDetailed(area, from, to, { skipMesh: true });
    // Only the near placeable's wok should be mesh-tested.
    expect(isStaticWalkClearOnWalkMeshMock).toHaveBeenCalledTimes(1);
    expect(isStaticWalkClearOnWalkMeshMock.mock.calls[0][0]).toBe(
      near.collisionManager.walkmesh
    );
  });

  it("onlyObjectId tests a single placeable", () => {
    const near = makePlaceable({ id: 10, x: 0, y: 0 });
    const other = makePlaceable({ id: 11, x: 1, y: 0 });
    const area = {
      doors: [],
      placeables: [near, other],
      staticBlockerGridDirty: true,
    } as unknown as ModuleArea;
    const from = new THREE.Vector3(-2, 0, 0);
    const to = new THREE.Vector3(2, 0, 0);
    isStaticWalkClearDetailed(area, from, to, {
      skipMesh: true,
      onlyObjectId: 10,
    });
    expect(isStaticWalkClearOnWalkMeshMock).toHaveBeenCalledTimes(1);
    expect(isStaticWalkClearOnWalkMeshMock.mock.calls[0][0]).toBe(
      near.collisionManager.walkmesh
    );
  });

  it("skips syncWalkmeshMatrix when collisionMatrixDirty is false", () => {
    const plc = makePlaceable({ id: 5, x: 0, y: 0 });
    plc.collisionMatrixDirty = false;
    const area = {
      doors: [],
      placeables: [plc],
      staticBlockerGridDirty: true,
    } as unknown as ModuleArea;
    isStaticWalkClearDetailed(
      area,
      new THREE.Vector3(-2, 0, 0),
      new THREE.Vector3(2, 0, 0),
      { skipMesh: true }
    );
    expect(plc.syncWalkmeshMatrix).not.toHaveBeenCalled();
  });
});

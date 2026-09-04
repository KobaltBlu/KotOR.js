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

jest.mock("@/engine/pathfinding/no-non-walk-polys-mesh", () => ({
  noNonWalkPolysOnWalkMesh: () => ({ clear: true }),
}));

import { noNonWalkPolysDetailed } from "@/engine/pathfinding/no-non-walk-polys";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleDoor } from "@/module/ModuleDoor";

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

describe("noNonWalkPolysDetailed door open mesh", () => {
  it("open door with empty/missing wok does not facing-plane block", () => {
    const door = makeDoor({ open: true, faces: 0 });
    const area = { doors: [door], placeables: [] } as unknown as ModuleArea;
    const from = new THREE.Vector3(0, -2, 0);
    const to = new THREE.Vector3(0, 2, 0);
    const result = noNonWalkPolysDetailed(area, from, to, { skipMesh: true });
    expect(result.clear).toBe(true);
  });

  it("closed door with no wok uses facing-plane and can block", () => {
    const door = makeDoor({ open: false, faces: 0 });
    const area = { doors: [door], placeables: [] } as unknown as ModuleArea;
    // Facing 0 → normal along +X; cross from −X to +X through the door box
    const from = new THREE.Vector3(-2, 0, 0);
    const to = new THREE.Vector3(2, 0, 0);
    const result = noNonWalkPolysDetailed(area, from, to, { skipMesh: true });
    expect(result.clear).toBe(false);
    expect(result.blockingObjectId).toBe(door.id);
  });
});

describe("noNonWalkPolysDetailed static placeables", () => {
  it("static placeable without surface wok does not AABB-block", () => {
    // NoNonWalkPolys only tests CSWCollisionMesh.
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
    } as unknown as ModuleArea;
    const from = new THREE.Vector3(-2, 0, 0);
    const to = new THREE.Vector3(2, 0, 0);
    const result = noNonWalkPolysDetailed(area, from, to, { skipMesh: true });
    expect(result.clear).toBe(true);
  });
});

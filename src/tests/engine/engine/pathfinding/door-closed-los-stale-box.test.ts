/**
 * @jest-environment node
 *
 * Regression: after a door opens, visual model door.box can sit at the jamb.
 * Closed DWK still fills the doorway — combat LOS must use DWK AABB, not the
 * stale model box, or attacks pass through closed doors.
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    raycaster: new THREE.Raycaster(),
    ModuleObjectManager: { GetObjectById: () => undefined },
    module: undefined,
  },
}));

import { composeDoorWalkmeshLocalToWorld } from "@engine/pathfinding/door-walkmesh-matrix";
import { isStaticWalkClearDetailed } from "@engine/pathfinding/static-walk-blockers";
import { isStaticWalkClearOnWalkMesh } from "@engine/pathfinding/static-walk-blockers-mesh";
import { hasVisualLos } from "@engine/pathfinding/visual-los";
import type { ModuleArea } from "@engine/module/ModuleArea";
import type { ModuleDoor } from "@engine/module/ModuleDoor";
import type { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";

/**
 * Closed leaf with a wall the corridor pierces in 2D (local X=0 plane).
 * Needed for combat LOS personalSpace≈0.001 (radius floored to 0.05) —
 * a single offset face at y=-0.37 only blocks with large personal space.
 */
function makeClosedPiercingWok(): OdysseyWalkMesh {
  const vertices = [
    new THREE.Vector3(0, -0.5, 0),
    new THREE.Vector3(0, 0.5, 0),
    new THREE.Vector3(0, -0.5, 3.13),
    new THREE.Vector3(0, 0.5, 3.13),
    // Extra verts so world AABB still spans the doorway width
    new THREE.Vector3(-2.785, -0.37, 0),
    new THREE.Vector3(2.778, 0.48, 0),
  ];
  const surfacemat = { walk: false, walkCheck: true, label: "Nonwalk" };
  const face = {
    a: 0, b: 1, c: 3,
    surfacemat,
    walk: false,
    walkCheck: true,
    materialIndex: 7,
    walkIndex: 7,
    normal: new THREE.Vector3(-1, 0, 0),
  } as unknown as OdysseyFace3;
  const wok = {
    header: { position: new THREE.Vector3(0, 0, 0) },
    vertices,
    faces: [face],
    walkableFaces: [],
    matrixWorld: new THREE.Matrix4(),
    mat4: new THREE.Matrix4(),
  } as unknown as OdysseyWalkMesh;
  face.walkmesh = wok;
  return wok;
}

/** Open jamb leaf AABB — does not cover the closed doorway corridor. */
function makeStaleOpenPoseBox(doorPos: THREE.Vector3): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(doorPos.x + 1.5, doorPos.y - 0.3, doorPos.z - 0.5),
    new THREE.Vector3(doorPos.x + 3.0, doorPos.y + 0.3, doorPos.z + 3.0),
  );
}

describe("closed door LOS with stale open-pose model box", () => {
  const doorPos = new THREE.Vector3(21.12, 20.713, -1.32);
  const doorRot = new THREE.Euler(0, 0, Math.PI / 2);

  function makeClosedDoor(): ModuleDoor {
    const wok = makeClosedPiercingWok();
    composeDoorWalkmeshLocalToWorld(
      wok.matrixWorld,
      doorPos,
      doorRot,
      wok.header.position,
    );
    return {
      id: 42,
      position: doorPos,
      rotation: doorRot,
      facing: Math.PI / 2,
      // Bug repro: model AABB left at open jamb after close
      box: makeStaleOpenPoseBox(doorPos),
      isOpen: () => false,
      getWalkmeshForOpenState: () => wok,
      collisionManager: { walkmesh: wok },
    } as unknown as ModuleDoor;
  }

  it("isStaticWalkClearDetailed blocks corridor despite stale door.box", () => {
    const door = makeClosedDoor();
    const area = {
      doors: [door],
      placeables: [],
      staticBlockerGridDirty: true,
    } as unknown as ModuleArea;
    // World Y crossing → local X crossing through wall at local x=0 (R_z π/2)
    const from = new THREE.Vector3(doorPos.x, doorPos.y + 1.0, doorPos.z);
    const to = new THREE.Vector3(doorPos.x, doorPos.y - 1.0, doorPos.z);

    const wok = door.getWalkmeshForOpenState!();
    expect(
      isStaticWalkClearOnWalkMesh(wok, from, to, {
        personalSpace: 0.001,
        faceStartIndex: 0,
      }).clear
    ).toBe(false);

    const result = isStaticWalkClearDetailed(area, from, to, {
      personalSpace: 0.001,
      skipMesh: true,
    });
    expect(result.clear).toBe(false);
    expect(result.blockingObjectId).toBe(door.id);
  });

  it("hasVisualLos is blocked by closed DWK despite stale door.box", () => {
    const door = makeClosedDoor();
    const area = {
      doors: [door],
      placeables: [],
      rooms: [],
      staticBlockerGridDirty: true,
    } as unknown as ModuleArea;
    const from = new THREE.Vector3(doorPos.x, doorPos.y + 1.0, doorPos.z);
    const to = new THREE.Vector3(doorPos.x, doorPos.y - 1.0, doorPos.z);
    expect(hasVisualLos(area, from, to, { eyeHeight: 1.5 })).toBe(false);
  });
});

describe("open door jamb still clears doorway", () => {
  it("OPEN2 with header.position does not block doorway corridor", () => {
    const doorPos = new THREE.Vector3(21.12, 20.713, -1.32);
    const headerPos = new THREE.Vector3(-2.78502, 0.0522412, 0);
    const vertices = [
      new THREE.Vector3(0, -0.42373, 0),
      new THREE.Vector3(0, 0.42373, 0),
      new THREE.Vector3(0, -0.42373, 3.1269),
      new THREE.Vector3(0, 0.42373, 3.1269),
    ];
    const surfacemat = { walk: false, walkCheck: true, label: "Nonwalk" };
    const face0 = {
      a: 1, b: 0, c: 2,
      surfacemat,
      walk: false,
      walkCheck: true,
      materialIndex: 7,
      walkIndex: 7,
      normal: new THREE.Vector3(-1, 0, 0),
    } as unknown as OdysseyFace3;
    const face1 = {
      a: 2, b: 3, c: 1,
      surfacemat,
      walk: false,
      walkCheck: true,
      materialIndex: 7,
      walkIndex: 7,
      normal: new THREE.Vector3(-1, 0, 0),
    } as unknown as OdysseyFace3;
    const wok = {
      header: { position: headerPos.clone() },
      vertices,
      faces: [face0, face1],
      walkableFaces: [],
      matrixWorld: new THREE.Matrix4(),
      mat4: new THREE.Matrix4(),
    } as unknown as OdysseyWalkMesh;
    face0.walkmesh = wok;
    face1.walkmesh = wok;

    const door = {
      id: 71,
      position: doorPos,
      rotation: new THREE.Euler(0, 0, Math.PI / 2),
      facing: Math.PI / 2,
      box: new THREE.Box3(
        new THREE.Vector3(20.99, 17.64, -1.4),
        new THREE.Vector3(21.25, 23.8, 1.7),
      ),
      isOpen: () => true,
      getWalkmeshForOpenState: () => wok,
      collisionManager: { walkmesh: wok },
    } as unknown as ModuleDoor;

    const area = {
      doors: [door],
      placeables: [],
      staticBlockerGridDirty: true,
    } as unknown as ModuleArea;
    const from = new THREE.Vector3(doorPos.x - 0.25, doorPos.y + 0.4, doorPos.z);
    const to = new THREE.Vector3(doorPos.x - 0.25, doorPos.y - 0.4, doorPos.z);
    const result = isStaticWalkClearDetailed(area, from, to, {
      personalSpace: 0.4,
      skipMesh: true,
    });
    expect(result.clear).toBe(true);
  });
});

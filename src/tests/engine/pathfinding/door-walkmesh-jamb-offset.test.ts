/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import { composeDoorWalkmeshLocalToWorld } from "@/engine/pathfinding/door-walkmesh-matrix";
import { isStaticWalkClearOnWalkMesh } from "@/engine/pathfinding/static-walk-blockers-mesh";
import { isStaticWalkClearDetailed } from "@/engine/pathfinding/static-walk-blockers";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyFace3 } from "@/three/odyssey";

/** dor_lhr012-style open plane at local x=0 with jamb header.position. */
function makeOpen2Wok(headerPosition: THREE.Vector3): OdysseyWalkMesh {
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
    header: { position: headerPosition.clone() },
    vertices,
    faces: [face0, face1],
    walkableFaces: [],
    matrixWorld: new THREE.Matrix4(),
    mat4: new THREE.Matrix4(),
  } as unknown as OdysseyWalkMesh;
  face0.walkmesh = wok;
  face1.walkmesh = wok;
  return wok;
}

/** dor_lhr010-style closed box across opening (local X span, thin Y). */
function makeClosedWok(): OdysseyWalkMesh {
  const vertices = [
    new THREE.Vector3(-2.785, -0.37, 0),
    new THREE.Vector3(2.778, -0.37, 0),
    new THREE.Vector3(-2.785, 0.48, 0),
    new THREE.Vector3(2.778, 0.48, 0),
    new THREE.Vector3(-2.785, -0.37, 3.13),
    new THREE.Vector3(2.778, -0.37, 3.13),
    new THREE.Vector3(-2.785, 0.48, 3.13),
    new THREE.Vector3(2.778, 0.48, 3.13),
  ];
  const surfacemat = { walk: false, walkCheck: true, label: "Nonwalk" };
  // Front face (y ≈ -0.37) — blocks crossing in Y through door origin
  const face = {
    a: 0, b: 1, c: 5,
    surfacemat,
    walk: false,
    walkCheck: true,
    materialIndex: 7,
    walkIndex: 7,
    normal: new THREE.Vector3(0, -1, 0),
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

describe("composeDoorWalkmeshLocalToWorld", () => {
  it("includes BWM header.position jamb offset in LocalToWorld", () => {
    const out = new THREE.Matrix4();
    const doorPos = new THREE.Vector3(21.12, 20.713, -1.32);
    const doorRot = new THREE.Euler(0, 0, Math.PI / 2);
    const headerPos = new THREE.Vector3(-2.785, 0.052, 0);
    composeDoorWalkmeshLocalToWorld(out, doorPos, doorRot, headerPos);

    // Local origin maps to door + R * header
    const worldOrigin = new THREE.Vector3(0, 0, 0).applyMatrix4(out);
    // R_z(π/2) * (-2.785, 0.052) = (-0.052, -2.785)
    expect(worldOrigin.x).toBeCloseTo(doorPos.x - 0.052, 2);
    expect(worldOrigin.y).toBeCloseTo(doorPos.y - 2.785, 2);

    const withoutHeader = new THREE.Matrix4();
    composeDoorWalkmeshLocalToWorld(withoutHeader, doorPos, doorRot, null);
    const atDoor = new THREE.Vector3(0, 0, 0).applyMatrix4(withoutHeader);
    expect(atDoor.x).toBeCloseTo(doorPos.x, 5);
    expect(atDoor.y).toBeCloseTo(doorPos.y, 5);
  });
});

describe("open door jamb offset clears doorway", () => {
  const doorPos = new THREE.Vector3(21.12, 20.713, -1.32);
  const doorRot = new THREE.Euler(0, 0, Math.PI / 2);
  const headerPos = new THREE.Vector3(-2.78502, 0.0522412, 0);

  it("OPEN2 with header.position: corridor through door origin is clear", () => {
    const wok = makeOpen2Wok(headerPos);
    composeDoorWalkmeshLocalToWorld(wok.matrixWorld, doorPos, doorRot, headerPos);

    const from = new THREE.Vector3(doorPos.x - 0.25, doorPos.y + 0.4, doorPos.z + 0.5);
    const to = new THREE.Vector3(doorPos.x - 0.25, doorPos.y - 0.4, doorPos.z + 0.5);
    const result = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.4,
      faceStartIndex: 0,
    });
    expect(result.clear).toBe(true);
  });

  it("OPEN2 without header.position: corridor through door origin blocks", () => {
    const wok = makeOpen2Wok(headerPos);
    // Bug repro: door pose only — plane sits in the doorway
    composeDoorWalkmeshLocalToWorld(wok.matrixWorld, doorPos, doorRot, null);

    const from = new THREE.Vector3(doorPos.x - 0.25, doorPos.y + 0.4, doorPos.z + 0.5);
    const to = new THREE.Vector3(doorPos.x - 0.25, doorPos.y - 0.4, doorPos.z + 0.5);
    const result = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.4,
      faceStartIndex: 0,
    });
    expect(result.clear).toBe(false);
  });

  it("CLOSED leaf still blocks crossing the doorway", () => {
    const wok = makeClosedWok();
    composeDoorWalkmeshLocalToWorld(wok.matrixWorld, doorPos, doorRot, wok.header.position);

    const from = new THREE.Vector3(doorPos.x, doorPos.y + 1.0, doorPos.z + 0.5);
    const to = new THREE.Vector3(doorPos.x, doorPos.y - 1.0, doorPos.z + 0.5);
    const result = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.4,
      faceStartIndex: 0,
    });
    expect(result.clear).toBe(false);
  });
});

describe("isStaticWalkClearDetailed open door with jamb mesh", () => {
  it("open door OPEN2 mesh with header.position does not block doorway corridor", () => {
    const doorPos = new THREE.Vector3(21.12, 20.713, -1.32);
    const headerPos = new THREE.Vector3(-2.78502, 0.0522412, 0);
    const wok = makeOpen2Wok(headerPos);
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

    const area = { doors: [door], placeables: [] } as unknown as ModuleArea;
    const from = new THREE.Vector3(doorPos.x - 0.25, doorPos.y + 0.4, doorPos.z);
    const to = new THREE.Vector3(doorPos.x - 0.25, doorPos.y - 0.4, doorPos.z);
    const result = isStaticWalkClearDetailed(area, from, to, {
      personalSpace: 0.4,
      skipMesh: true,
    });
    expect(result.clear).toBe(true);
  });
});

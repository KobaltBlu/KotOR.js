/**
 * Placeable PWK LocalToWorld + start-overlap escape (desk footprint).
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import { composeObjectWalkmeshLocalToWorld } from "@/engine/pathfinding/door-walkmesh-matrix";
import { isStaticWalkClearOnWalkMesh } from "@/engine/pathfinding/static-walk-blockers-mesh";
import { isStaticWalkClearDetailed } from "@/engine/pathfinding/static-walk-blockers";
import { createWalkHitInfo, WalkHitKind } from "@/engine/pathfinding/walk-hit-info";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModulePlaceable } from "@/module/ModulePlaceable";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyFace3 } from "@/three/odyssey";

/** Same rule as player-control-policy.projectOntoTangent (avoid importing GameState). */
function projectOntoTangent(
  desiredX: number,
  desiredY: number,
  normalX: number,
  normalY: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const nLen = Math.hypot(normalX, normalY);
  if(nLen < 1e-8){
    return out.set(desiredX, desiredY, 0);
  }
  const nx = normalX / nLen;
  const ny = normalY / nLen;
  const vn = desiredX * nx + desiredY * ny;
  if(vn < 0){
    out.set(desiredX - nx * vn, desiredY - ny * vn, 0);
  }else{
    out.set(desiredX, desiredY, 0);
  }
  return out;
}

/** plc_desk1-style flat Nonwalk rectangle (local verts + header.position). */
function makeDesk1Wok(headerPosition: THREE.Vector3): OdysseyWalkMesh {
  const vertices = [
    new THREE.Vector3(1.60433, 0.415739, 0),
    new THREE.Vector3(-1.59906, 0.415739, 0),
    new THREE.Vector3(-1.59906, -0.421907, 0),
    new THREE.Vector3(1.60433, -0.421907, 0),
  ];
  const surfacemat = { walk: false, walkCheck: true, label: "Nonwalk" };
  // Retail plc_desk1 stores zero face normals — Edge hits must derive XY from edges.
  const zeroN = () => new THREE.Vector3(0, 0, 0);
  const face0 = {
    a: 2, b: 3, c: 0,
    surfacemat,
    walk: false,
    walkCheck: true,
    materialIndex: 7,
    walkIndex: 7,
    normal: zeroN(),
    pointInFace2d(pt: THREE.Vector3){
      const wm = (this as OdysseyFace3).walkmesh!;
      const v1 = wm.vertices[this.a];
      const v2 = wm.vertices[this.b];
      const v3 = wm.vertices[this.c];
      const sign = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) =>
        (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
      const d1 = sign(pt, v1, v2);
      const d2 = sign(pt, v2, v3);
      const d3 = sign(pt, v3, v1);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      return !(hasNeg && hasPos);
    },
  } as unknown as OdysseyFace3;
  const face1 = {
    a: 2, b: 0, c: 1,
    surfacemat,
    walk: false,
    walkCheck: true,
    materialIndex: 7,
    walkIndex: 7,
    normal: zeroN(),
    pointInFace2d: face0.pointInFace2d,
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

describe("composeObjectWalkmeshLocalToWorld placeable header.position", () => {
  it("applies BWM header.position offset like door DWK", () => {
    const out = new THREE.Matrix4();
    const plcPos = new THREE.Vector3(67.5, 66.0, 0);
    const plcRot = new THREE.Euler(0, 0, 0);
    const headerPos = new THREE.Vector3(0, 0.04, 0);
    composeObjectWalkmeshLocalToWorld(out, plcPos, plcRot, headerPos);

    const worldOrigin = new THREE.Vector3(0, 0, 0).applyMatrix4(out);
    expect(worldOrigin.x).toBeCloseTo(plcPos.x, 5);
    expect(worldOrigin.y).toBeCloseTo(plcPos.y + 0.04, 5);
  });
});

describe("placeable desk footprint start-overlap escape", () => {
  const plcPos = new THREE.Vector3(67.5, 66.0, 0);
  const headerPos = new THREE.Vector3(0, 0.04, 0);

  it("blocks entering the desk footprint from outside", () => {
    const wok = makeDesk1Wok(headerPos);
    composeObjectWalkmeshLocalToWorld(
      wok.matrixWorld, plcPos, new THREE.Euler(0, 0, 0), headerPos
    );
    // Approach from −Y into the desk
    const from = new THREE.Vector3(plcPos.x, plcPos.y - 1.2, 0.5);
    const to = new THREE.Vector3(plcPos.x, plcPos.y, 0.5);
    const result = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.4,
    });
    expect(result.clear).toBe(false);
  });

  it("softClearStartOverlap allows stepping off an overlapping origin", () => {
    const wok = makeDesk1Wok(headerPos);
    composeObjectWalkmeshLocalToWorld(
      wok.matrixWorld, plcPos, new THREE.Euler(0, 0, 0), headerPos
    );
    // Origin on desk footprint (header shifts Y by +0.04)
    const from = new THREE.Vector3(plcPos.x, plcPos.y + 0.04, 0.5);
    const to = new THREE.Vector3(plcPos.x, plcPos.y - 1.2, 0.5);
    const hard = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.4,
      softClearStartOverlap: false,
    });
    expect(hard.clear).toBe(false);

    const soft = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.4,
      softClearStartOverlap: true,
    });
    expect(soft.clear).toBe(true);
  });

  it("softClearStartOverlap still blocks edge-graze into the desk (collide/slide)", () => {
    const wok = makeDesk1Wok(headerPos);
    composeObjectWalkmeshLocalToWorld(
      wok.matrixWorld, plcPos, new THREE.Euler(0, 0, 0), headerPos
    );
    // Outside footprint but personal-space touches the −Y edge
    const edgeY = plcPos.y + 0.04 - 0.421907;
    const from = new THREE.Vector3(plcPos.x, edgeY - 0.35, 0.5);
    const to = new THREE.Vector3(plcPos.x, edgeY + 0.1, 0.5);
    const soft = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.4,
      softClearStartOverlap: true,
    });
    expect(soft.clear).toBe(false);
  });

  it("softClearStartOverlap still blocks a dest that stays on the desk", () => {
    const wok = makeDesk1Wok(headerPos);
    composeObjectWalkmeshLocalToWorld(
      wok.matrixWorld, plcPos, new THREE.Euler(0, 0, 0), headerPos
    );
    const from = new THREE.Vector3(plcPos.x - 0.5, plcPos.y + 0.04, 0.5);
    const to = new THREE.Vector3(plcPos.x + 0.5, plcPos.y + 0.04, 0.5);
    const soft = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.4,
      softClearStartOverlap: true,
    });
    expect(soft.clear).toBe(false);
  });

  it("isStaticWalkClearDetailed soft-clears placeable start overlap", () => {
    const wok = makeDesk1Wok(headerPos);
    const plc = {
      id: 151,
      position: plcPos,
      rotation: new THREE.Euler(0, 0, 0),
      box: new THREE.Box3(
        new THREE.Vector3(plcPos.x - 2, plcPos.y - 1, -1),
        new THREE.Vector3(plcPos.x + 2, plcPos.y + 1, 2),
      ),
      syncWalkmeshMatrix(){
        composeObjectWalkmeshLocalToWorld(
          wok.matrixWorld, this.position, this.rotation, headerPos
        );
      },
      collisionManager: { walkmesh: wok },
    } as unknown as ModulePlaceable;

    const area = { doors: [], placeables: [plc] } as unknown as ModuleArea;
    const from = new THREE.Vector3(plcPos.x, plcPos.y + 0.04, 0);
    const to = new THREE.Vector3(plcPos.x, plcPos.y - 1.2, 0);

    const hard = isStaticWalkClearDetailed(area, from, to, {
      personalSpace: 0.4,
      skipMesh: true,
      softClearStartOverlap: false,
    });
    expect(hard.clear).toBe(false);
    expect(hard.blockingObjectId).toBe(151);

    const soft = isStaticWalkClearDetailed(area, from, to, {
      personalSpace: 0.4,
      skipMesh: true,
      softClearStartOverlap: true,
    });
    expect(soft.clear).toBe(true);
  });
});

describe("placeable desk Edge hit XY normals (angled slide)", () => {
  // Identity rotation: local +X is world +X (east edge at local x = +1.604).
  const plcPos = new THREE.Vector3(66.5, 67.4, 0);
  const headerPos = new THREE.Vector3(0, 0.04, 0);

  it("zero face normals still yield outward XY Edge normal on east approach", () => {
    const wok = makeDesk1Wok(headerPos);
    composeObjectWalkmeshLocalToWorld(
      wok.matrixWorld, plcPos, new THREE.Euler(0, 0, 0), headerPos
    );
    const eastX = plcPos.x + 1.60433;
    const from = new THREE.Vector3(eastX + 0.4, plcPos.y + 0.04, 0.5);
    const to = new THREE.Vector3(eastX - 0.05, plcPos.y + 0.04, 0.5);
    const hit = createWalkHitInfo();
    const result = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.35,
      softClearStartOverlap: true,
      hit,
    });
    expect(result.clear).toBe(false);
    expect(hit.kind).toBe(WalkHitKind.Edge);
    // Outward from east edge toward actor (+X)
    expect(hit.normal.x).toBeGreaterThan(0.9);
    expect(Math.abs(hit.normal.y)).toBeLessThan(0.15);
    expect(hit.normal.z).toBeCloseTo(0, 5);
  });

  it("angled desired against Edge normal keeps along-edge slide component", () => {
    const wok = makeDesk1Wok(headerPos);
    composeObjectWalkmeshLocalToWorld(
      wok.matrixWorld, plcPos, new THREE.Euler(0, 0, 0), headerPos
    );
    const eastX = plcPos.x + 1.60433;
    const from = new THREE.Vector3(eastX + 0.4, plcPos.y + 0.04, 0.5);
    // Angled into desk (−X) with +Y slide component (live Carth-style)
    const to = new THREE.Vector3(eastX - 0.1, plcPos.y + 0.04 + 0.25, 0.5);
    const hit = createWalkHitInfo();
    const result = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: 0.35,
      softClearStartOverlap: true,
      hit,
    });
    expect(result.clear).toBe(false);
    expect(hit.kind).toBe(WalkHitKind.Edge);

    const desired = new THREE.Vector3(to.x - from.x, to.y - from.y, 0);
    const slide = new THREE.Vector3();
    projectOntoTangent(desired.x, desired.y, hit.normal.x, hit.normal.y, slide);
    // −desired fallback would zero this; edge normal must keep +Y
    expect(Math.hypot(slide.x, slide.y)).toBeGreaterThan(0.15);
    expect(slide.y).toBeGreaterThan(0.1);
  });
});

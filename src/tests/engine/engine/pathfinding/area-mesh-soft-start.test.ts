/**
 * Room Nonwalk skirt soft-start + near-Z Edge normals (m36aa perimeter graze).
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import { isStaticWalkClearOnAreaMesh } from "@engine/pathfinding/static-walk-blockers-mesh";
import { createWalkHitInfo, WalkHitKind } from "@engine/pathfinding/walk-hit-info";
import type { Area } from "@engine/module/Area";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";
import type { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";

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

/**
 * Flat Nonwalk triangle south of edge y=0 (shared with walk to the north).
 * Face normal is near-Z with tiny XY — retail room skirts / m36aa-style.
 */
function makeFlatNonwalkSkirt(): {
  face: OdysseyFace3;
  edgeA: THREE.Vector3;
  edgeB: THREE.Vector3;
  geometricOutward: THREE.Vector3;
} {
  const vertices = [
    new THREE.Vector3(0, 0, 1.39),
    new THREE.Vector3(5, 0, 1.39),
    new THREE.Vector3(2.5, -0.5, 1.39),
  ];
  const surfacemat = { walk: false, walkCheck: true, label: "Nonwalk" };
  const face = {
    a: 0,
    b: 1,
    c: 2,
    surfacemat,
    walk: false,
    walkCheck: true,
    materialIndex: 7,
    walkIndex: 7,
    // Live m36aa Nonwalk skirt: z≈1 with tiny baked XY
    normal: new THREE.Vector3(-0.00079, 0.0004, 1),
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
  const wok = {
    vertices,
    faces: [face],
    walkableFaces: [],
  } as unknown as OdysseyWalkMesh;
  face.walkmesh = wok;
  return {
    face,
    edgeA: vertices[0],
    edgeB: vertices[1],
    geometricOutward: new THREE.Vector3(0, 1, 0),
  };
}

describe("area mesh Nonwalk skirt soft-start", () => {
  const radius = 0.36;
  // Capsule center north of edge, within personal space (live m36aa dist≈0.328)
  const grazeY = 0.328;

  it("hard corridor blocks when start capsule already grazes the skirt edge", () => {
    const { face } = makeFlatNonwalkSkirt();
    const area = { placeables: [] } as unknown as Area;
    const from = new THREE.Vector3(2.5, grazeY, 1.4);
    const to = new THREE.Vector3(2.5, grazeY + 0.1, 1.4);
    const hard = isStaticWalkClearOnAreaMesh(area, from, to, {
      personalSpace: radius,
      candidateFaces: [face],
      softClearStartOverlap: false,
    });
    expect(hard.clear).toBe(false);
  });

  it("softClearStartOverlap allows a short outward escape step", () => {
    const { face } = makeFlatNonwalkSkirt();
    const area = { placeables: [] } as unknown as Area;
    const from = new THREE.Vector3(2.5, grazeY, 1.4);
    const to = new THREE.Vector3(2.5, grazeY + 0.1, 1.4);
    const soft = isStaticWalkClearOnAreaMesh(area, from, to, {
      personalSpace: radius,
      candidateFaces: [face],
      softClearStartOverlap: true,
    });
    expect(soft.clear).toBe(true);
  });

  it("softClearStartOverlap still blocks a dest that stays overlapping the edge", () => {
    const { face } = makeFlatNonwalkSkirt();
    const area = { placeables: [] } as unknown as Area;
    const from = new THREE.Vector3(2.5, grazeY, 1.4);
    // Pure tangent — dest circle still intersects the skirt edge
    const to = new THREE.Vector3(2.5 + 0.2, grazeY, 1.4);
    const soft = isStaticWalkClearOnAreaMesh(area, from, to, {
      personalSpace: radius,
      candidateFaces: [face],
      softClearStartOverlap: true,
    });
    expect(soft.clear).toBe(false);
  });
});

describe("area mesh near-Z Nonwalk Edge normals", () => {
  it("derives outward XY Edge normal instead of copying near-Z face normal", () => {
    const { face, geometricOutward } = makeFlatNonwalkSkirt();
    const area = { placeables: [] } as unknown as Area;
    const from = new THREE.Vector3(2.5, 0.5, 1.4);
    const to = new THREE.Vector3(2.5, 0.1, 1.4);
    const hit = createWalkHitInfo();
    const result = isStaticWalkClearOnAreaMesh(area, from, to, {
      personalSpace: 0.36,
      candidateFaces: [face],
      softClearStartOverlap: false,
      hit,
    });
    expect(result.clear).toBe(false);
    expect(hit.kind).toBe(WalkHitKind.Edge);
    const xy = Math.hypot(hit.normal.x, hit.normal.y);
    expect(xy).toBeGreaterThan(0.9);
    expect(Math.abs(hit.normal.z)).toBeLessThan(0.1);
    const dot =
      hit.normal.x * geometricOutward.x + hit.normal.y * geometricOutward.y;
    expect(dot).toBeGreaterThan(0.9);
  });

  it("angled desired against derived Edge normal keeps along-edge slide", () => {
    const { face } = makeFlatNonwalkSkirt();
    const area = { placeables: [] } as unknown as Area;
    const from = new THREE.Vector3(2.5, 0.5, 1.4);
    const to = new THREE.Vector3(2.5 - 0.15, 0.1, 1.4);
    const hit = createWalkHitInfo();
    const result = isStaticWalkClearOnAreaMesh(area, from, to, {
      personalSpace: 0.36,
      candidateFaces: [face],
      softClearStartOverlap: false,
      hit,
    });
    expect(result.clear).toBe(false);
    expect(hit.kind).toBe(WalkHitKind.Edge);

    const desired = new THREE.Vector3(to.x - from.x, to.y - from.y, 0);
    const slide = new THREE.Vector3();
    projectOntoTangent(desired.x, desired.y, hit.normal.x, hit.normal.y, slide);
    expect(Math.hypot(slide.x, slide.y)).toBeGreaterThan(0.1);
    expect(Math.abs(slide.x)).toBeGreaterThan(0.1);
  });
});

/**
 * Clipped line: hop across room walkmesh transition edges (live 07j↔02b seam).
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import { clippedLineSegmentWalkable } from "@engine/pathfinding/clipped-line-segment";
import type { Area } from "@engine/module/Area";
import type { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";

function pointInTri(
  pt: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  v3: THREE.Vector3
): boolean {
  const sign = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(pt, v1, v2);
  const d2 = sign(pt, v2, v3);
  const d3 = sign(pt, v3, v1);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/**
 * Live-style seam at y=75: south room 07j / north room 02b.
 * South face listed first in walkFaces (first-match would trap without hop fix).
 */
function makeSeamArea(transition: number): {
  area: Area;
  origin: THREE.Vector3;
  dest: THREE.Vector3;
} {
  const southVerts = [
    new THREE.Vector3(88.8, 75, 0),   // 0 — west on seam
    new THREE.Vector3(96.75, 75, 0),  // 1 — east on seam
    new THREE.Vector3(92.775, 70, 0), // 2 — south interior
  ];
  const northVerts = [
    new THREE.Vector3(88.8, 75, 0),   // 0
    new THREE.Vector3(96.75, 75, 0),  // 1
    new THREE.Vector3(92.775, 80, 0), // 2 — north interior
  ];

  const southWok = {
    name: "m02ac_07j",
    vertices: southVerts,
  } as unknown as OdysseyWalkMesh;
  const northWok = {
    name: "m02ac_02b",
    vertices: northVerts,
  } as unknown as OdysseyWalkMesh;

  const southFace = {
    a: 1, b: 0, c: 2, // seam side 0: east→west so north dest is "outside"
    walkmesh: southWok,
    adjacentWalkableFaces: { a: undefined, b: undefined, c: undefined },
    triangle: new THREE.Triangle(southVerts[1], southVerts[0], southVerts[2]),
    pointInFace2d(pt: THREE.Vector3){
      return pointInTri(pt, southVerts[1], southVerts[0], southVerts[2]);
    },
  } as unknown as OdysseyFace3;

  const northFace = {
    a: 0, b: 1, c: 2, // seam along north's south edge
    walkmesh: northWok,
    adjacentWalkableFaces: { a: undefined, b: undefined, c: undefined },
    triangle: new THREE.Triangle(northVerts[0], northVerts[1], northVerts[2]),
    pointInFace2d(pt: THREE.Vector3){
      return pointInTri(pt, northVerts[0], northVerts[1], northVerts[2]);
    },
  } as unknown as OdysseyFace3;

  // Side 0 = verts a→b = seam (96.75,75)→(88.8,75)
  const edge = {
    transition,
    line: new THREE.Line3(southVerts[1].clone(), southVerts[0].clone()),
    face: southFace,
    walkmesh: southWok,
    side: 0,
  };
  southFace.adjacentWalkableFaces.a = edge as never;

  // South face first — reproduces first-match trap at the seam
  const area = {
    walkFaces: [southFace, northFace],
  } as unknown as Area;

  const origin = new THREE.Vector3(92.36, 74.80, 0);
  const dest = new THREE.Vector3(92.36, 75.50, 0);
  return { area, origin, dest };
}

describe("clippedLineSegmentWalkable transition hop", () => {
  it("crosses a shared transition edge into the other room walkmesh", () => {
    const { area, origin, dest } = makeSeamArea(2);
    const result = clippedLineSegmentWalkable(area, origin, dest);
    expect(result.ok).toBe(true);
    expect(result.clearT).toBeCloseTo(1, 5);
  });

  it("blocks when the seam edge is a non-transition wall", () => {
    const { area, origin, dest } = makeSeamArea(-1);
    const result = clippedLineSegmentWalkable(area, origin, dest);
    expect(result.ok).toBe(false);
    // Real wall normal (into the south walkable face), not -direction.
    expect(result.hasWallNormal).toBe(true);
    expect(result.wallNormal.x).toBeCloseTo(0, 6);
    expect(result.wallNormal.y).toBeCloseTo(-1, 6);
  });

  it("reports the wall edge normal for a diagonal approach", () => {
    const { area, origin } = makeSeamArea(-1);
    const dest = new THREE.Vector3(origin.x + 0.6, origin.y + 0.4, 0);
    const result = clippedLineSegmentWalkable(area, origin, dest);
    expect(result.ok).toBe(false);
    expect(result.hasWallNormal).toBe(true);
    // A -direction stand-in would have a large -X component.
    expect(Math.abs(result.wallNormal.x)).toBeLessThan(1e-6);
    expect(result.wallNormal.y).toBeCloseTo(-1, 6);
  });

  it("hops even when a short nudge still lies on the source face footprint", () => {
    // Origin close to seam; 5cm nudge alone used to return source face via first-match
    const { area, origin, dest } = makeSeamArea(21);
    origin.set(92.36, 74.95, 0);
    dest.set(92.36, 75.40, 0);
    const result = clippedLineSegmentWalkable(area, origin, dest);
    expect(result.ok).toBe(true);
  });
});

describe("clippedLineSegmentWalkable strict off-mesh start", () => {
  function offMeshArea(){
    const { area } = makeSeamArea(-1);
    // South face spans y ∈ [70, 75] near x = 92.775; nearest mesh point below it.
    (area as unknown as { getNearestWalkablePoint: (p: THREE.Vector3) => THREE.Vector3 })
      .getNearestWalkablePoint = (p) => new THREE.Vector3(p.x, 70, 0);
    return area;
  }

  it("blocks a step that moves farther from the walkmesh, with a normal toward it", () => {
    const area = offMeshArea();
    const r = clippedLineSegmentWalkable(
      area,
      new THREE.Vector3(92.775, 69, 0),
      new THREE.Vector3(92.775, 68.5, 0),
      { strictOffMeshStart: true }
    );
    expect(r.ok).toBe(false);
    expect(r.hasWallNormal).toBe(true);
    expect(r.wallNormal.y).toBeCloseTo(1, 6);
  });

  it("allows a step toward the walkmesh", () => {
    const area = offMeshArea();
    const r = clippedLineSegmentWalkable(
      area,
      new THREE.Vector3(92.775, 69, 0),
      new THREE.Vector3(92.775, 69.5, 0),
      { strictOffMeshStart: true }
    );
    expect(r.ok).toBe(true);
  });

  it("allows a step that lands back on a walk face", () => {
    const area = offMeshArea();
    const r = clippedLineSegmentWalkable(
      area,
      new THREE.Vector3(92.775, 69.9, 0),
      new THREE.Vector3(92.775, 71, 0),
      { strictOffMeshStart: true }
    );
    expect(r.ok).toBe(true);
  });

  it("keeps the permissive legacy result without the strict flag", () => {
    const area = offMeshArea();
    const r = clippedLineSegmentWalkable(
      area,
      new THREE.Vector3(92.775, 69, 0),
      new THREE.Vector3(92.775, 60, 0)
    );
    expect(r.ok).toBe(true);
  });
});
